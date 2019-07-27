export const ce = document.createElement.bind(document)

export const ct = document.createTextNode.bind(document)

export const createButton = (text: string, attrs: Object): HTMLButtonElement => {
  const btn = ce('button')
  Object.assign(btn, attrs)
  btn.appendChild(ct(text))
  return btn
}

export const createOption = (text: string, value: string, defaultSelected = false) => {
  const option = ce('Option') as HTMLOptionElement
  option.text = text;
  option.value = value
  option.defaultSelected = defaultSelected
  return option
}