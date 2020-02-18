import Workspace from "../common/Workspace";
import throttle from "lodash/throttle";
import { observeDOM, tryTillSuccess } from "../common/utils";

const MAIN_MESSAGE_LIST_SELECTOR = '.c-message_list .c-virtual_list__item'
const THREAD_MESSAGE_LIST_SELECTOR = '.p-workspace__secondary_view .c-virtual_list__item'
const THREAD_PREVIEW_AVATAR_BUTTON_SELECTOR = '.c-avatar--interactive'

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

const removeThreadPreviewAvatars = (workspace: Workspace) => async () => {
  const avatarNodes = document.querySelectorAll(THREAD_PREVIEW_AVATAR_BUTTON_SELECTOR)
  const blackList = workspace.blackList.list
  let isBlocked = false
  let userId: string

  Array.from(avatarNodes).forEach((node) => {
    const $avatar = node.querySelector('img') as HTMLImageElement
    const idMatch = $avatar.src.match(/slack[^.]*\.com\/[^-]+-([^-]+)/)
    if (!idMatch) return false
    userId = idMatch[1]
    isBlocked = blackList.has(userId);
    (node as HTMLImageElement).style.display = isBlocked ? 'none' : 'block'
  })
}

const createMessageListFilterer = (workspace: Workspace) => async () => {
  const messageNodes = document.querySelectorAll(MAIN_MESSAGE_LIST_SELECTOR)
  const blackList = workspace.blackList.list
  let isBlocked = false;

  Array.from(messageNodes).forEach(node => {
      const $div = node.querySelector('div')
      if (!$div || !($div.classList.contains('c-message') || $div.classList.contains('c-message_kit__message'))) return;
      const isAdjacent = $div.classList.contains('c-message--adjacent')
      if (!isAdjacent) {
        const userId = getUserIdFromVirtualItem(node)
        if (!userId) return
        isBlocked = blackList.has(userId)
      }
      (node as HTMLElement).style.display = isBlocked ? 'none' : 'block'
  })
}

const createThreadFilterer = (workspace: Workspace) => async () => {
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
      createMessageListFilterer(workspace),
      500
    )
    const threadPreviewAvatarFilterer = throttle(
      removeThreadPreviewAvatars(workspace),
      500
    )
    const mutations = () => {
      messageListFilterer()
      threadPreviewAvatarFilterer()
    }
    observeDOM($messageList, { childList: true, subtree: false }, mutations)
    workspace.blackList.onUpdate = mutations
    mutations()
  }
  startObserve()

  tryTillSuccess(() => {
    const $secPanel = document.body.querySelector('.p-workspace__secondary_view_contents')
    if (!$secPanel) return false
    let stopThreadObserve: Function
    const messageListFilterer = throttle(
      createThreadFilterer(workspace),
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
