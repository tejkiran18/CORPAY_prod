import { registerAll } from '../../../../src/router/register-all.js'
import { dispatch } from '../../../../src/router/v1.js'

registerAll()

async function handle(req, ctx) {
  const params = await ctx.params
  const path = (params?.path || []).join('/')
  return dispatch(req, path)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
