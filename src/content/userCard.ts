import { observeDOM, tryTillSuccess, getWorkspaceId } from '../common/utils'
import {createButton } from '../common/dom'
import Workspace from '../common/Workspace'

function checkingMutation(
  mutations: MutationRecord[],
  callback: (node: Element, flags: { isApp: boolean }) => void) {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach((_node) => {
      const node = _node as Element
      if(!node.classList.contains('ReactModalPortal')) return
      let $card = node.querySelector('.p-app_profile_card__container')
      if ($card) return callback($card, { isApp: true })
      $card = node.querySelector('.p-member_profile_card')
      if ($card) return callback($card, { isApp: false })
    })
  })
}

export default function startUserCardHook(workspace: Workspace) {
  observeDOM(document.body, { childList: true }, (mutations) => {
    checkingMutation(mutations, (node, { isApp }) => {
      const $picture = node.querySelector('.p-member_profile_picture') as HTMLElement
      if (!$picture) return
      const idMatch = $picture.style.backgroundImage 
        && $picture.style.backgroundImage.match(/slack[^.]*\.com\/[^-]+-([^-]+)/)
      if (!idMatch) return
      const id = idMatch[1]
      const $name = node.querySelector('.p-member_profile_name__link')
      if (!$name) return
      const name = $name.textContent as string
      const user = { id, name }

      const blockBtn = createButton('Block 👿', {
        className: 'c-button c-button--danger c-button--medium p-member_profile_buttons__button null--outline null--medium'
      })

      const onClick = async () => {
        await workspace.blockUser(user)
        blockBtn.innerText = 'Blocked ♥'
      }

      blockBtn.addEventListener('click', onClick);
      
      (node.querySelector('.p-member_profile_card__buttons') as HTMLElement)
        .appendChild(blockBtn)
    })
  })
}