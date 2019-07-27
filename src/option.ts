import { workspaces } from "./common/Storage";
import { createOption } from "./common/dom";
import Workspace from "./common/Workspace";

const joinValue = (name: string, id: string) => [name, id].join('_|_')
const splitValue = (value: string) => value.split('_|_')

const $uList = document.getElementById('userlist') as HTMLSelectElement;
const $wsList = document.getElementById('wsList') as HTMLSelectElement;
let currentWorkspace: Workspace
(async () => {
  await workspaces.ready()
  workspaces.getList().forEach(async ({ id, name}, idx) => {
    const option = createOption(name, joinValue(id, name), idx === 0)
    $wsList.add(option)
  })
  $wsList.addEventListener('change', (event) => {
    const [id, name] = splitValue((event.target as HTMLSelectElement).value)
    currentWorkspace = new Workspace({ id, name })
    loadUsersByCurrentWS()
  })
  $uList.addEventListener('change', (event) => {
    removeUser((event.target as HTMLSelectElement).value)
  })
  currentWorkspace = new Workspace(workspaces.getList()[0])
  loadUsersByCurrentWS()
})()

async function loadUsersByCurrentWS() {
  removeOptions($uList);
  await currentWorkspace.blackList.ready()
  currentWorkspace.blackList.getList().forEach(async ({ id, name }) => {
    const option = createOption(name, joinValue(id, name))
    $uList.add(option)
  })
}

async function removeUser(value: string) {
  const [id, name] = splitValue(value)
  await currentWorkspace.blackList.remove({ id, name })
  loadUsersByCurrentWS()
}

function removeOptions($list: HTMLSelectElement) {
  for(let i = $list.options.length - 1 ; i >= 0 ; i--) $list.remove(i);
}
