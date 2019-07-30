import Workspace from "../common/Workspace";
import throttle from "lodash/throttle";
import { observeDOM, tryTillSuccess } from "../common/utils";

const MAIN_MESSAGE_LIST_SELECTOR = '.c-message_list .c-virtual_list__item'
const THREAD_MESSAGE_LIST_SELECTOR = '.p-workspace__secondary_view .c-virtual_list__item'

const getUserIdFromVirtualItem = (node: Element) => {
  let userId: string
  const $userLink = node.querySelector('.c-message__sender_link') as HTMLLinkElement
  if ($userLink)  {
    const idMatch = $userLink.href.match(/(?:team|services)\/([^/]+)/)
    if (!idMatch) return false
    userId = idMatch[1]
  } else {
    const $avatar = node.querySelector('.c-avatar__image') as HTMLImageElement
    if (!$avatar) return false
    const idMatch = $avatar.src.match(/slack[^.]*\.com\/[^-]+-([^-]+)/)
    if (!idMatch) return false
    userId = idMatch[1]
  }
  return userId
}

const crearteMessageListFilterer = (workspace: Workspace) => async () => {
  const messageNodes = document.querySelectorAll(MAIN_MESSAGE_LIST_SELECTOR)
  const blackList = workspace.blackList.list
  let isBlocked = false;
  Array.from(messageNodes).forEach(node => {
      const $div = node.querySelector('div')
      if (!$div || !$div.classList.contains('c-message')) return;
      const isAdjacent = $div.classList.contains('c-message--adjacent')
      if (!isAdjacent) {
        const userId = getUserIdFromVirtualItem(node)
        if (!userId) return
        isBlocked = blackList.has(userId)
      }
      (node as HTMLElement).style.display = isBlocked ? 'none' : 'block'
  })
}

const crearteThreadFilterer = (workspace: Workspace) => async () => {
  const messageNodes = document.querySelectorAll(THREAD_MESSAGE_LIST_SELECTOR)
  const blackList = workspace.blackList.list
  Array.from(messageNodes).forEach(node => {
      const $div = node.querySelector('div')
      if (!$div || !$div.classList.contains('c-message_kit__thread_message')) return;
      const userId = getUserIdFromVirtualItem(node)
      if (!userId) return
      const isBlocked = blackList.has(userId);
      (node as HTMLElement).style.display = isBlocked ? 'none' : 'block'
  })
}

/**
 * Handle following flows
 * - Thread is open initially with loading
 * - Thread is not open initally then open later with loading
 * - Thread is not open initally then open without loading
 */
function onSideBarToggle(parentNode: HTMLElement, callback: (toggle: boolean) => void) {
  const VL_CONTAINER_CLASS = 'c-virtual_list__scroll_container'
  const checkThreadContainer = (node: Node) => (node as HTMLElement).querySelector('.p-threads_flexpane_container')
  const checkLoading = () => {
    if (parentNode.querySelector(`.${VL_CONTAINER_CLASS}`)) return callback(true)
    const stop = observeDOM(parentNode, { subtree: true }, (mutations) => {
      if(mutations
        .some((mutation) => {
          const target = mutation.target as HTMLElement
          return target.classList && target.classList.contains(VL_CONTAINER_CLASS)
        })
      ) {
        callback(true)
        stop()
      }
    })
  }
  if (checkThreadContainer(parentNode)) checkLoading()
  observeDOM(parentNode, { childList: true }, (mutations) => {
    if (mutations.some(mutation => [...mutation.addedNodes].some(checkThreadContainer))) return checkLoading()
    if (mutations.some(mutation => [...mutation.removedNodes].some(checkThreadContainer))) return callback(false)
  })
}

export default async function startMessageListHook(workspace: Workspace) {
  await workspace.blackList.ready()
  const startObserve = () => {
    const $messageList = document.body.querySelector('.c-message_list .c-virtual_list__scroll_container')
    if (!$messageList) return setTimeout(startObserve, 200)
    const messageListFilterer = throttle(
      crearteMessageListFilterer(workspace),
      500
    )
    observeDOM($messageList, { childList: true, subtree: false }, messageListFilterer)
    workspace.blackList.onUpdate = messageListFilterer
    messageListFilterer()
  }
  startObserve()

  tryTillSuccess(() => {
    const $secPanel = document.body.querySelector('.p-workspace__secondary_view_contents')
    if (!$secPanel) return false
    let stopThreadObserve: Function
    const messageListFilterer = throttle(
      crearteThreadFilterer(workspace),
      500
    )
    onSideBarToggle($secPanel as HTMLElement, (toggle) => {
      const $messageList = $secPanel.querySelector('.c-virtual_list__scroll_container')
      if (!$messageList) return
      if (toggle) {
        stopThreadObserve = observeDOM($messageList, { childList: true, subtree: false }, messageListFilterer)
      } else {
        stopThreadObserve()
      }
      messageListFilterer()
    })
  }, 500)
}
