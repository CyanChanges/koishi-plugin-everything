import { Context, Schema, Service } from "koishi";
import { Notifier } from '@koishijs/plugin-notifier'

declare module 'koishi' {
  interface Context {
    'everything.notifier': EverythingNotifier
  }
}

export class EverythingNotifier extends Service {
  static inject = ['everything', 'notifier']
  notifier: Notifier

  constructor(protected ctx: Context, protected config: EverythingNotifier.Config) {
    super(ctx, 'everything.notifier', true)
    ctx.accept(neo => {
      this.notify()
    })
  }

  async handle() {
    await this.ctx.everything.installEverything()
  }

  notify() {
    if (!this.config.show) {
      this.notifier.dispose()
      return
    } else if (!this.notifier)
      this.notifier = this.ctx.notifier.create({})

    this.notifier.update(<>
      <p>ChangeLog:</p>
      <p>@koishijs/market: x.xx.x</p>
      <p>feat(market): bulk install everything</p>
      <button onClick={async () => await this.handle()}>Try now!</button>
    </>)
  }

  async start() {
    this.notify()
  }
}

export namespace EverythingNotifier {
  export interface Config {
    show: boolean
  }

  export const Config: Schema<Config> = Schema.object({
    show: Schema.boolean().default(true).description("展示 notifier")
  })
}
