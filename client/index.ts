import { Context } from '@koishijs/client'
import Everything from './everything-page.vue'

import 'virtual:uno.css'

export default (ctx: Context) => {
  ctx.page({
    name: 'Everything',
    path: '/everything-page',
    component: Everything,
  })
}
