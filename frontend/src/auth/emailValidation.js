export const EMAIL_MAX_LENGTH = 254
export const EMAIL_GUIDANCE = 'Enter a valid email address, such as player@example.com.'

const EMAIL_PATTERN = new RegExp(
  "^(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+"
  + "(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9]"
  + '(?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?'
  + '(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$',
)

export function isValidEmail(value) {
  if (typeof value !== 'string') return false
  const email = value.trim()
  return email.length > 0
    && email.length <= EMAIL_MAX_LENGTH
    && EMAIL_PATTERN.test(email)
}
