import Storage, { workspaces, StorageEntity, Entity } from './Storage'
type User = Entity
export default class Workspace {
  blackList: StorageEntity
  constructor(ws: Entity) {
    workspaces.ensure(ws)
    this.blackList = new StorageEntity(`${ws.id}_blockList`)
  }

  blockUser(user: User) {
    return this.blackList.add(user)
  }

  unblockUser(user: User) {
    return this.blackList.remove(user)
  }
}