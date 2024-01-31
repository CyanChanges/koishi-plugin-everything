import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/plugin-console'
import { Everything, EverythingProvider } from "./everything";
import { EverythingNotifier } from "./notifier";

export const name = 'everything'

export interface Config {
  everything: Everything.Config,
  notifier: EverythingNotifier.Config
}

export const Config: Schema<Config> = Schema.object({
  everything: Everything.Config,
  notifier: EverythingNotifier.Config
})

export function apply(ctx: Context, config: Config) {
  ctx.plugin(Everything, config.everything)
  ctx.plugin(EverythingNotifier, config.notifier)
  ctx.plugin(EverythingProvider)
  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}
