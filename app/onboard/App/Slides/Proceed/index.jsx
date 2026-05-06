import React, { useState } from 'react'
import styled from 'styled-components'

import { SlideProceed } from '../../styled'

const ProceedButton = styled.div`
  width: 180px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgb(5,150,105), rgb(16,185,129));
  border: 1px solid rgba(16,185,129,0.12);
  box-shadow: 0 2px 16px rgba(0,0,0,0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  animation: vaultCardShow 400ms linear both;
  animation-delay: 400ms;
  font-weight: 500;
  cursor: pointer;
  color: var(--outerspace);
  &:hover {
    background: linear-gradient(135deg, rgb(4,120,87), rgb(5,150,105));
    box-shadow: 0 4px 20px rgba(16,185,129,0.25);
  }
`

export const ProceedSkip = styled.span`
  display: inline-block;
  height: 32px;
  font-size: 10px;
  border-radius: 16px;
  border: 2px solid var(--ghostX);
  padding: 8px 16px;
  box-sizing: border-box;
  animation: vaultCardShow 400ms linear both;
  animation-delay: 400ms;
  font-weight: 500;
  cursor: pointer;
  text-transform: uppercase;
  color: var(--outerspace08);
  &:hover {
    color: var(--outerspace);
  }
`

const clickThrottle = (fn, [block, setBlock]) => {
  return () => {
    if (!block) {
      fn()
      setBlock(true)
      setTimeout(() => setBlock(false), 600)
    }
  }
}

export const Proceed = ({ slide, proceed = {}, nextSlide, prevSlide, onComplete }) => {
  const blockState = useState(false)
  if (proceed.action === 'next') {
    return (
      <SlideProceed key={slide}>
        <ProceedButton role='button' onClick={clickThrottle(nextSlide, blockState)}>
          {proceed.text}
        </ProceedButton>
      </SlideProceed>
    )
  } else if (proceed.action === 'skip') {
    return (
      <SlideProceed key={slide}>
        <ProceedSkip role='button' onClick={clickThrottle(nextSlide, blockState)}>
          {proceed.text}
        </ProceedSkip>
      </SlideProceed>
    )
  } else if (proceed.action === 'complete') {
    return (
      <SlideProceed key={slide}>
        <ProceedButton role='button' onClick={clickThrottle(onComplete, blockState)}>
          {proceed.text}
        </ProceedButton>
      </SlideProceed>
    )
  } else {
    return null
  }
}

export default Proceed
