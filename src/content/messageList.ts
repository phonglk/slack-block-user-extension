import Workspace from "../common/Workspace";
import throttle from "lodash/throttle";
import { observeDOM } from "../common/utils";

const renderMessageList = async (workspace: Workspace) => {
  const messageNodes = document.querySelectorAll('.c-message_list .c-virtual_list__item')
  const blackList = workspace.blackList.list
  let isBlocked = false;
  Array.from(messageNodes).forEach(node => {
      const $div = node.querySelector('div')
      if (!$div || !$div.classList.contains('c-message')) return;
      const isAdjacent = $div.classList.contains('c-message--adjacent')
      if (!isAdjacent) {
        let userId: string
        const $avatar = node.querySelector('.c-avatar__image') as HTMLImageElement
        if ($avatar)  {
          const idMatch = $avatar.src.match(/slack[^.]*\.com\/[^-]+-([^-]+)/)
          if (!idMatch) return
          userId = idMatch[1]
        } else {
          const $userLink = node.querySelector('.c-message__sender_link') as HTMLLinkElement
          if (!$userLink) return
          const idMatch = $userLink.href.match(/(?:team|services)\/([^/]+)/)
          if (!idMatch) return
          userId = idMatch[1]
        }
        isBlocked = blackList.has(userId)
      }
      (node as HTMLElement).style.display = isBlocked ? 'none' : 'block'
  })
}

const scheduledRenderMessageList = throttle(renderMessageList, 500, { leading: false, trailing: true })

export default function startMessageListHook(workspace: Workspace) {
  const startObserve = () => {
    const $messageList = document.body.querySelector('.c-message_list .c-virtual_list__scroll_container')
    if (!$messageList) return setTimeout(startObserve, 200)
    observeDOM($messageList, { childList: true, substree: true }, () => scheduledRenderMessageList(workspace))
    workspace.blackList.onUpdate = () => scheduledRenderMessageList(workspace)
    scheduledRenderMessageList(workspace)
  }
  startObserve()
}
