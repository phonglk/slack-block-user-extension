type StorageValue = string | number | Object

const Storage = {
  set: (key: string, value: StorageValue) => new Promise<any>(resolve => {
    chrome.storage.sync.set({[key]: value}, resolve);
  }),
  get: (keyOrObject: string | Object, defaultValue: StorageValue) => new Promise<any>(resolve => {
    if (typeof keyOrObject === 'object') {
      chrome.storage.sync.get(keyOrObject, obj => resolve(obj));
    } else {
      chrome.storage.sync.get({[keyOrObject]: defaultValue}, obj => resolve(obj[keyOrObject]));
    }
  }),
  remove: (key: string) => new Promise<any>(resolve => {
    chrome.storage.sync.remove(key, resolve)
  }),
  inspect: () => new Promise(resolve => {
    chrome.storage.sync.get(null, result => {
      console.info(JSON.stringify(result))
      resolve();
    });
  })
}

export type Entity = { name: string, id: string}
export class StorageEntity {
  storageKey: string;
  nameMapKey: string;
  isLoaded = false;
  __isReady = false;
  list = new Set<string>();
  nameMap = new Map<string, string>();
  __onReady: (value?: any) => void = () => {};
  onUpdate = () => {}
  constructor(storageKey: string) {
    this.storageKey = storageKey
    this.nameMapKey = `${storageKey}_nameMap`
    this.load().then(() => {
      this.__isReady = true;
      this.__onReady()
    })
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[storageKey]) {
        this.load().then(this.onUpdate)
      }
    })
  }
  ready() {
    if (this.__isReady) return Promise.resolve()
    return new Promise(resolve => this.__onReady = resolve)
  }
  async load () {
    if (this.isLoaded) return this.list
    this.list = new Set(await Storage.get(this.storageKey, []))
    this.nameMap = new Map(await Storage.get(this.nameMapKey, []))
    this.isLoaded = true
  }
  getList() {
    return [...this.list].map(id => ({ id, name: this.nameMap.get(id) || id }))
  }
  async save () {
    await Storage.set(this.storageKey, Array.from(this.list))
    await Storage.set(this.nameMapKey, Array.from(this.nameMap))
    return true
  }
  async add (entity: Entity) {
    this.list.add(entity.id)
    this.nameMap.set(entity.id, entity.name)
    await this.save()
  }
  async ensure(entity: Entity) {
    if (this.list.has(entity.id)) return true
    return this.add(entity)
  }
  async remove(entity: Entity) {
    this.list.delete(entity.id)
    this.nameMap.delete(entity.id)
    await this.save()
    Storage.inspect()
  }
}

export const workspaces = new StorageEntity('WORKSPACES')

export default Storage