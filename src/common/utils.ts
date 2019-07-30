export const tryTillSuccess = (fn: Function, interval = 500) => {
  try {
    const result = fn()
    if (result === false) throw new Error()
  } catch (e) {
    setTimeout(() => tryTillSuccess(fn, interval), interval)
  }
}

export const getWorkspaceId = () => {
  const match = location.href.match(/client\/([^/]*)/)
  return match && match[1]
}

export const observeDOM = (targetNode: Node,
  userConfig: { attributes?: boolean, childList?: boolean, subtree?: boolean },
  callback: MutationCallback ) => {
  const config = { attributes: false, childList: false, subtree: false, ...userConfig }
  var observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
  return () => observer.disconnect();
}