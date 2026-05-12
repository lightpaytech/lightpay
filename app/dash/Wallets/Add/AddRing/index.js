import { useState } from 'react'
import { addHexPrefix, isHexString, isValidPrivate } from '@ethereumjs/util'
import zxcvbn from 'zxcvbn'

import RingIcon from '../../../../../resources/Components/RingIcon'
import useFocusableRef from '../../../../../resources/Hooks/useFocusableRef'
import link from '../../../../../resources/link'

const removeLineBreaks = (str) => str.replace(/(\r\n|\n|\r)/gm, '')

const validatePrivateKey = (privateKeyStr) => {
  if (!privateKeyStr) return ''
  const prefixed = addHexPrefix(privateKeyStr)
  if (!isHexString(prefixed) || !isValidPrivate(prefixed.slice(2))) {
    return 'INVALID PRIVATE KEY'
  }
  return ''
}

const validatePasswordStrength = (password) => {
  if (!password) return ''
  if (password.length < 12) return 'PASSWORD MUST BE 12 OR MORE CHARACTERS'
  const {
    feedback: { warning },
    score
  } = zxcvbn(password)
  if (score > 2) return ''
  return (warning || 'PLEASE ENTER A STRONGER PASSWORD').toUpperCase()
}

export default function AddRing({ accountData = {} }) {
  const secretRef = useFocusableRef(true, 100)
  const [secret, setSecret] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [processing, setProcessing] = useState(false)

  const secretError = validatePrivateKey(secret)
  const passwordError = validatePasswordStrength(password)
  const confirmError = confirmPassword && password !== confirmPassword ? 'PASSWORDS DO NOT MATCH' : ''

  const ready =
    !!secret && !secretError && !!password && !passwordError && !!confirmPassword && !confirmError

  const handleSubmit = () => {
    if (!ready || processing) return
    setProcessing(true)
    setSubmitError('')
    link.rpc('createFromPrivateKey', secret, password, (err, signer) => {
      if (err) {
        setProcessing(false)
        setSubmitError(typeof err === 'string' ? err : err?.message || 'Unable to create account')
        return
      }
      link.send('nav:back', 'dash', 4)
      link.send('nav:forward', 'dash', {
        view: 'expandedSigner',
        data: { signer: signer.id }
      })
    })
  }

  return (
    <div className={'addWalletItem addAccountItemSmart addWalletItemPending'}>
      <div className='addAccountItemBar addAccountItemHot' />
      <div className='addAccountItemWrap'>
        <div className='addAccountItemTop'>
          <div className='addAccountItemTopType'>
            <div className='addAccountItemIcon'>
              <div className='addAccountItemIconType addAccountItemIconHot'>
                <RingIcon svgName='key' />
              </div>
              <div className='addAccountItemIconHex addAccountItemIconHexHot' />
            </div>
            <div className='addAccountItemTopTitle'>Private Key</div>
          </div>
          <div className='addAccountItemSummary'>
            A private key account lets you add accounts from individual private keys
          </div>
        </div>
        <div className='addAccountItemOption'>
          <div className='addAccountItemOptionSetup' style={{ transform: 'translateX(0%)' }}>
            <div className='addAccountItemOptionSetupLightPays'>
              <div className='addAccountItemOptionSetupLightPay'>
                <div role='heading' className='addAccountItemOptionTitle'>
                  Private Key
                </div>
                <div className='addAccountItemOptionInput phrase'>
                  <textarea
                    ref={secretRef}
                    tabIndex='-1'
                    value={secret}
                    onChange={(e) => setSecret(removeLineBreaks(e.target.value))}
                  />
                </div>
                {secretError ? (
                  <div role='button' className='addAccountItemOptionError'>
                    {secretError}
                  </div>
                ) : null}
              </div>

              <div className='addAccountItemOptionSetupLightPay'>
                <div role='heading' className='addAccountItemOptionTitle'>
                  Create Password
                </div>
                <div className='addAccountItemOptionInput addAccountItemOptionInputPassword'>
                  <input
                    role='textbox'
                    type='password'
                    tabIndex='-1'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {passwordError ? (
                  <div role='button' className='addAccountItemOptionError'>
                    {passwordError}
                  </div>
                ) : null}
              </div>

              <div className='addAccountItemOptionSetupLightPay'>
                <div role='heading' className='addAccountItemOptionTitle'>
                  Confirm Password
                </div>
                <div className='addAccountItemOptionInput addAccountItemOptionInputPassword'>
                  <input
                    role='textbox'
                    type='password'
                    tabIndex='-1'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && ready) handleSubmit()
                    }}
                  />
                </div>
                {confirmError ? (
                  <div role='button' className='addAccountItemOptionError'>
                    {confirmError}
                  </div>
                ) : null}

                {submitError ? (
                  <div role='button' className='addAccountItemOptionError'>
                    {submitError}
                  </div>
                ) : processing ? (
                  <div role='button' className='addAccountItemOptionProcessing'>
                    Processing...
                  </div>
                ) : (
                  <div
                    role='button'
                    className='addWalletSubmitBtn'
                    onClick={handleSubmit}
                    style={{ opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'not-allowed' }}
                  >
                    Create
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className='addAccountItemFooter' />
      </div>
    </div>
  )
}
