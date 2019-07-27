import { tryTillSuccess, getWorkspaceId } from '../common/utils'
import Workspace from '../common/Workspace'
import startUserCardHook from './userCard'
import startMessageListHook from './messageList'

tryTillSuccess(() => {
  const name = document.title.split(' | ')[1]
  const id = getWorkspaceId()
  if (!name || !id) return false
  const workspace = new Workspace({ id, name })
  startUserCardHook(workspace)
  startMessageListHook(workspace)
})