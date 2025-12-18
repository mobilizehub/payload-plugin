'use client'

import {
  Button,
  ConfirmationModal,
  toast,
  useDocumentInfo,
  useFormModified,
  useModal,
} from '@payloadcms/ui'
import React from 'react'

interface SendBroadcastModalProps {
  buttonLabel?: string
  modalBody?: string
  modalSlug?: string
  modalTitle?: string
}

const apiEndpoint = '/api/send-broadcast'

export const SendBroadcastModal: React.FC<SendBroadcastModalProps> = ({
  buttonLabel = 'Send broadcast',
  modalBody = 'Are you sure you want to send this broadcast?',
  modalSlug = 'send-broadcast-modal',
  modalTitle = 'Send Broadcast',
}) => {
  const { id, initialData } = useDocumentInfo()
  const modified = useFormModified()

  const isDraft = initialData?.status === 'draft'

  const { toggleModal } = useModal()
  if (!id) {
    return null
  }

  const handleOpenModal = () => {
    toggleModal(modalSlug)
  }

  const handleConfirm = async () => {
    await fetch(apiEndpoint, {
      body: JSON.stringify({ broadcastId: id }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    toast.success('Broadcast queued for sending')
    window.location.reload()
    toggleModal(modalSlug)
  }

  return (
    <>
      <Button disabled={modified || !isDraft} onClick={handleOpenModal} size="medium">
        {buttonLabel}
      </Button>

      <ConfirmationModal
        body={modalBody || <p>Are you sure you want to proceed with this action?</p>}
        heading={modalTitle}
        modalSlug={modalSlug}
        onConfirm={handleConfirm}
      />
    </>
  )
}
