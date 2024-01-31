import { Client, DataService } from '@koishijs/console'
import type {} from '@koishijs/plugin-market'
import Scanner, { SearchObject, RemotePackage, Registry, SearchResult } from '@koishijs/registry'
import { Context, Dict, Quester, Schema, Service } from "koishi";
import { loadManifest } from "@koishijs/plugin-market/src/node/installer";

declare module 'koishi' {
  interface Events {
    'everything/after-collect'(result: RemotePackage[][]): void

    'everything/before-collect'(): void

    'everything/collected'(object: SearchObject, versions: RemotePackage[]): void

    'everything/flush'(object: SearchObject, progress: { progress: number, total: number }): void
  }

  interface Context {
    everything: Everything
  }
}

declare module '@koishijs/console' {
  namespace Console {
    interface Services {
      everything: EverythingProvider
    }
  }

  interface Events {
    'everything/collect'(forced?: boolean): void
  }
}

export class Everything extends Service {
  private http: Quester
  static inject = ['installer']
  public versionsCache: Dict<RemotePackage[]> = Object.create(null)
  public registryCache: Dict<Registry> = Object.create(null)
  public everythingCache: Registry[] = []
  public tempCache: Registry[] = []
  public collectTask?: Promise<RemotePackage[][]>
  scanner: Scanner

  constructor(protected ctx: Context, protected config: Everything.Config) {
    super(ctx, 'everything', false);
    if (config.endpoint) this.http = ctx.http.extend(config)
  }

  async start() {
    this.collect().then()
    this.ctx.inject(['console'], (ctx: Context) => {
      ctx.console.addListener('everything/collect', (forced) => this.collect(forced))
    })
  }

  flush(object: SearchObject) {
    this.ctx.emit('everything/flush', object, {
      progress: this.scanner.progress,
      total: this.scanner.total
    })
  }

  async installEverything(collect = false) {
    if (collect) this.collect().then()
    const cache = Object.create(null)
    const overrider = this.ctx.throttle(() => this.ctx.installer.override(cache), 1000)
    const stop = this.ctx.on('everything/collected', (object, versions) => {
      if (versions[0]) {
        cache[object.package.name] = versions.at(0)?.version
        overrider()
      }
    })
    this.ctx.on("everything/after-collect", () => {
      stop()
      overrider.dispose()
    })
    return await this.ctx.installer.install(this.ctx.installer['manifest'].dependencies, true)
  }

  async collect(forced = false) {
    const { timeout } = this.config
    const registry = this.ctx.installer.http

    if (this.collectTask && !forced) return await this.collectTask

    // @ts-expect-error
    if (await this.ctx.serial('everything/before-collect')) return false

    this.scanner = new Scanner(registry.get)
    if (this.http) {
      const result = await this.http.get<SearchResult>('')
      this.scanner.objects = result.objects.filter(object => !object.ignored)
      this.scanner.total = this.scanner.objects.length
      this.scanner.version = result.version
    } else {
      await this.scanner.collect({ timeout })
    }

    if (!this.scanner.version) {
      const result = await this.scanner.analyze({
        version: '4',
        onRegistry: (registry, versions) => {
          this.registryCache[registry.name] = registry
          this.versionsCache[registry.name] = versions
        },
        onSuccess: async (object, versions) => {
          object.package.links ||= {
            npm: `${registry.config.endpoint.replace('registry.', 'www.')}/package/${object.package.name}`,
          }
          this.everythingCache[object.package.name] = this.tempCache[object.package.name] = object
          await this.ctx.parallel('everything/collected', object, versions)
        },
        after: (object) => this.flush(object),
      })
      if (result) this.ctx.emit('everything/after-collect', result)
      return result
    }

    return this.everythingCache
  }

  getEverything() {
    if (!this.everythingCache) return this.collect().then(() => this.everythingCache)
    return this.everythingCache
  }
}

export namespace Everything {
  export interface Config {
    endpoint: string
    timeout: number
  }

  export const Config: Schema<Config> = Schema.object({
    endpoint: Schema.string().role('link').default("https://registry.koishi.chat/index.json"),
    timeout: Schema.number().min(0).default(30000)
  })
}

export class EverythingProvider extends DataService<Registry[]> {
  static inject = ['everything', 'console']

  constructor(protected ctx: Context, config: any) {
    super(ctx, 'everything', { authority: 4 })
    ctx.on('everything/collected', ctx.throttle(async () => {
      await this.refresh(true)
    }, 1000))
  }

  async get(forced?: boolean, client?: Client) {
    return await this.ctx.everything.getEverything()
  }

  refresh(forced?: boolean): Promise<void> {
    return super.refresh(forced);
  }
}


