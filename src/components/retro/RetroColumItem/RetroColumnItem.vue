<template>
  <div
    ref="cardRef"
    :id="element.id.toString()"
    :class="[
      'card-container',
      {
        'card-container-is-editing': isEditing,
        'card-container-comments-open': isCommentsOpen,
      },
    ]"
    :key="element.id"
    :style="itemStyle"
  >
    <div ref="menuButtonRef" class="open-menu-button" @click="onMenuButtonClick">
      <SvgIcon name="cardMenuIcon" class="open-menu-button-icon" />
    </div>
    <RetroColumnItemMenu
      :is-open="isMenuOpen"
      :anchor-el="menuButtonRef"
      @close="closeMenu"
      @edit-card="onEditCardClick"
      @copy-text="onCopyTextClick"
      @set-color="onSetColor"
      @remove-color="onRemoveColor"
      @delete-card="onDeleteCardClick"
      :cardColor="element.color"
    />
    <div v-if="!isEditing" class="item-text-preview" @click="startEditingOnTextAreaClick">
      {{ editText || ' ' }}
    </div>
    <textarea
      v-else
      ref="textareaRef"
      v-model="editText"
      class="item-textarea item-textarea-isEditing"
      @click.stop
      @input="onDescriptionInput"
      @keydown.enter.exact.prevent="saveAndClose"
      @keydown.escape="cancelEditing"
    />
    <div :class="['card-footer', { 'card-footer-edited': isEditing }]" @click="onFooterClick">
      <template v-if="!isEditing">
        <span v-if="formattedCreatedAt" class="card-footer-date">{{ formattedCreatedAt }}</span>

        <div class="card-footer-actions">
          <div class="card-footer-like-container" @click="onLikeButtonClick">
            <button :class="['card-footer-button', { 'card-footer-button-liked': isLikedByMe }]">
              <SvgIcon v-if="isLikedByMe" name="filledLike" class="card-footer-button-icon" />
              <SvgIcon v-else name="like" class="card-footer-button-icon" />
            </button>
            <span
              :class="[
                'card-footer-button-likes-count',
                { 'card-footer-button-likes-count-liked': isLikedByMe },
              ]"
            >
              {{ element.likes.length }}
            </span>
          </div>

          <button
            type="button"
            class="card-footer-comment-container"
            :class="{ 'card-footer-comment-container-open': isCommentsOpen }"
            @click="onCommentsToggleClick"
          >
            <SvgIcon
              :name="isCommentsOpen ? 'filledComment' : 'comment'"
              class="card-footer-comment-icon"
            />
            <span class="card-footer-button-comments-count">{{ element.commentsCount }}</span>
          </button>
        </div>
      </template>
    </div>

    <section v-if="isCommentsOpen" class="card-comments" @click.stop @mousedown.stop>
      <p v-if="element.isDraft" class="card-comments-state">
        Сначала сохраните карточку, чтобы работать с комментариями.
      </p>

      <template v-else>
        <p v-if="isCommentsLoading" class="card-comments-state">Загрузка комментариев...</p>

        <div v-else class="card-comments-content">
          <form class="card-comments-create-form" @submit.prevent="onCreateCommentSubmit">
            <textarea
              v-model="newCommentText"
              class="card-comments-create-textarea"
              rows="3"
              placeholder="Добавьте комментарий"
              :disabled="isCreateCommentPending"
            />
            <p v-if="createCommentError" class="card-comments-error">{{ createCommentError }}</p>
            <button
              type="submit"
              class="card-comments-submit-button"
              :disabled="isCreateCommentPending || !canCreateComment"
            >
              {{ isCreateCommentPending ? 'Отправка...' : 'Отправить' }}
            </button>
          </form>

          <p v-if="commentsLoadError" class="card-comments-error">{{ commentsLoadError }}</p>
          <p v-else-if="comments.length === 0" class="card-comments-empty">Комментариев пока нет</p>

          <ul v-else class="card-comments-list">
            <li v-for="comment in comments" :key="comment.id" class="card-comment-item">
              <div class="card-comment-meta">
                <span class="card-comment-author">{{ getCommentAuthor(comment) }}</span>
                <span class="card-comment-date">{{ formatCommentDate(comment.createdAt) }}</span>
              </div>

              <p v-if="editingCommentId !== comment.id" class="card-comment-text">
                {{ comment.text }}
              </p>

              <div v-else class="card-comment-edit-form">
                <textarea
                  v-model="editingCommentText"
                  class="card-comment-edit-textarea"
                  rows="3"
                  :disabled="isCommentUpdating(comment.id)"
                />
                <div class="card-comment-edit-actions">
                  <button
                    type="button"
                    class="card-comment-action-button"
                    :disabled="isCommentUpdating(comment.id)"
                    @click="onSaveEditedComment(comment.id)"
                  >
                    {{ isCommentUpdating(comment.id) ? 'Сохранение...' : 'Сохранить' }}
                  </button>
                  <button
                    type="button"
                    class="card-comment-action-button card-comment-action-button-muted"
                    :disabled="isCommentUpdating(comment.id)"
                    @click="onCancelCommentEditing"
                  >
                    Отмена
                  </button>
                </div>
              </div>

              <p
                v-if="editingCommentId === comment.id && editingCommentError"
                class="card-comments-error card-comments-error-spaced"
              >
                {{ editingCommentError }}
              </p>

              <div
                v-if="
                  (canEditComment(comment) || canDeleteComment(comment)) &&
                  editingCommentId !== comment.id
                "
                class="card-comment-actions"
              >
                <button
                  v-if="canEditComment(comment)"
                  type="button"
                  class="card-comment-action-button card-comment-action-button-icon-only"
                  aria-label="Редактировать комментарий"
                  :disabled="isAnyCommentActionPending"
                  @click="onStartCommentEditing(comment)"
                >
                  <SvgIcon name="pencil" class="card-comment-action-icon" />
                </button>
                <button
                  v-if="canDeleteComment(comment)"
                  type="button"
                  class="card-comment-action-button card-comment-action-button-icon-only"
                  aria-label="Удалить комментарий"
                  :disabled="isAnyCommentActionPending"
                  @click="onDeleteComment(comment.id)"
                >
                  <SvgIcon name="trash" class="card-comment-action-icon" />
                </button>
              </div>
            </li>
          </ul>

          <p v-if="commentActionError" class="card-comments-error card-comments-error-spaced">
            {{ commentActionError }}
          </p>
        </div>
      </template>
    </section>

    <ConfirmDeleteModal
      :is-open="isDeleteCardModalOpen"
      title="Удалить карточку?"
      message="Карточка будет удалена без возможности восстановления."
      @close="onCloseDeleteCardModal"
      @confirm="onConfirmDeleteCard"
    />
  </div>
</template>

<style scoped>
.card-container {
  position: relative;
  margin-top: 16px;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  border-radius: 10px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  box-sizing: border-box;
}

.card-container-comments-open {
  cursor: default;
}

.card-container:hover {
  border: 2px solid color-mix(in srgb, var(--item-bg, #f0f0f0) 80%, black);
}

.item-textarea {
  display: block;
  width: calc(100% - 20px);
  min-height: 0;
  padding: 8px 10px;
  border: none;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  line-height: 1.4;
  resize: none;
  outline: none;
  field-sizing: content;
  border-radius: 2px;
  color: white;
}

.item-text-preview {
  width: calc(100% - 20px);
  min-height: 20px;
  padding: 8px 8px;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  line-height: 1.4;
  color: white;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: grab !important;
  user-select: none;
  -webkit-user-select: none;
}

.item-textarea-isEditing {
  cursor: caret !important;
  background-color: white;
  color: #333;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
  min-height: 18px;
  background-color: var(--item-bg, #f0f0f0);
  padding: 0 8px 4px;
  color: white;
  font-size: 12px;
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
}

.card-footer-edited {
  background-color: white;
}

.card-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-footer-button {
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  cursor: pointer;
  color: white;
  background: transparent;

  .card-footer-button-icon {
    width: 100%;
    display: block;
  }
}

.card-footer-button-liked {
  color: white;
}

.card-footer-date {
  line-height: 1;
  font-weight: 300;
  opacity: 0.95;
}

.card-footer-like-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 2px;
}

.card-footer-comment-container {
  display: flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: white;
  padding: 0;
  cursor: pointer;
}

.card-footer-comment-container-open {
  font-weight: 600;
}

.card-footer-comment-icon {
  width: 16px;
  height: 16px;
  display: block;
  flex-shrink: 0;
}

.card-footer-button-likes-count {
  transform: translateY(1px);
  font-weight: 400;
  cursor: pointer;
}

.card-footer-button-comments-count {
  transform: translateY(1px);
  font-size: 12px;
  font-weight: 400;
}

.card-footer-comment-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.card-footer-button-likes-count-liked {
  color: white;
  font-weight: 600;
}

.card-comments {
  background-color: var(--item-bg, #f0f0f0);
  padding: 10px 8px 8px;
}

.card-comments-state,
.card-comments-empty {
  margin: 0;
  font-size: 12px;
  color: white;
  padding-bottom: 6px;
}

.card-comments-content {
  display: grid;
  gap: 8px;
}

.card-comments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}

.card-comment-item {
  margin-top: 10px;
  border-radius: 8px;
  background-color: var(--item-bg, #f0f0f0);
  display: grid;
  gap: 8px;
}

.card-comment-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-comment-author {
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.card-comment-date {
  font-size: 12px;
  color: white;
  text-align: right;
}

.card-comment-text {
  margin: 0;
  font-size: 12px;
  color: white;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.card-comment-actions,
.card-comment-edit-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.card-comment-action-button {
  border: 1px solid #c5d3ea;
  background-color: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.card-comment-action-button-icon-only {
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 0;
  color: white;
  padding: 4px;
}

.card-comment-action-button-icon-only:hover {
  background: rgba(0, 0, 0, 0.274);
  border-radius: 4px;
}

.card-comment-action-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.card-comment-action-button-muted {
  color: #4d5d7a;
}

.card-comment-action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card-comment-edit-form {
  display: grid;
  gap: 6px;
}

.card-comment-edit-textarea,
.card-comments-create-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #c6d2e6;
  border-radius: 8px;
  padding: 6px 8px;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  color: #1f2a3d;
  resize: vertical;
  outline: none;
}

.card-comment-edit-textarea:disabled,
.card-comments-create-textarea:disabled {
  background-color: #f0f3f8;
  color: #6a7590;
}

.card-comments-create-form {
  display: grid;
  gap: 6px;
}

.card-comments-submit-button {
  justify-self: flex-end;
  border: 0px;
  background: color-mix(in srgb, var(--item-bg) 60%, black);
  color: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

.card-comments-submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card-comments-error {
  margin: 0;
  color: #b7364a;
  font-size: 12px;
}

.card-comments-error-spaced {
  margin-top: -2px;
}

.open-menu-button {
  position: absolute;
  top: 6px;
  right: 4px;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;

  .open-menu-button-icon {
    width: 12px;
    height: 12px;
    color: white;
    display: block;
  }
}

.open-menu-button:hover {
  background: color-mix(in srgb, var(--item-bg, #f0f0f0) 60%, black);
  color: white;
}
</style>

<style>
.sortable-chosen {
  cursor: grabbing !important;
  border: 2px solid color-mix(in srgb, var(--item-bg, #f0f0f0) 60%, black) !important;
}
</style>

<script setup lang="ts">
import {
  retroCommentsService,
  toRetroCommentsApiError,
  type RetroItemCommentResponseDto,
} from '@/api/services/retroCommentsService'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal/ConfirmDeleteModal.vue'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import { useRetroStore } from '@/stores/RetroStore'
import type { TRetroColumnItem } from '@/stores/RetroStore'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import RetroColumnItemMenu from './RetroColumnItemMenu.vue'

const retroStore = useRetroStore()
const props = defineProps<{
  element: TRetroColumnItem
}>()

const isEditing = ref(false)
const isMenuOpen = ref(false)
const editText = ref(props.element.description)
const cardRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const isDeleteCardModalOpen = ref(false)

const isCommentsOpen = ref(false)
const hasLoadedComments = ref(false)
const isCommentsLoading = ref(false)
const comments = ref<RetroItemCommentResponseDto[]>([])
const commentsLoadError = ref('')

const newCommentText = ref('')
const isCreateCommentPending = ref(false)
const createCommentError = ref('')

const editingCommentId = ref<number | null>(null)
const editingCommentText = ref('')
const editingCommentError = ref('')

const processingCommentId = ref<number | null>(null)
const processingCommentAction = ref<'update' | 'delete' | null>(null)
const commentActionError = ref('')

let commentsLoadRequestId = 0

const currentUserId = computed(() => retroStore.getCurrentUserId)
const currentUserTeamRole = computed(() => retroStore.getCurrentUserTeamRole)

const canManageCommentsByRole = computed(() => {
  return currentUserTeamRole.value === 'OWNER' || currentUserTeamRole.value === 'ADMIN'
})

const isAnyCommentActionPending = computed(() => {
  return processingCommentId.value !== null
})

const canCreateComment = computed(() => {
  if (props.element.isDraft) return false
  return newCommentText.value.trim().length > 0
})

const isLikedByMe = computed(() => {
  if (!currentUserId.value) return false
  return props.element.likes.includes(currentUserId.value)
})

const formattedCreatedAt = computed(() => {
  if (!props.element.createdAt) return ''
  const parsedDate = new Date(props.element.createdAt)
  if (!Number.isFinite(parsedDate.getTime())) return ''

  return parsedDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
})

const itemStyle = computed(() => (props.element.color ? { '--item-bg': props.element.color } : {}))

const getCommentApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  const apiError = toRetroCommentsApiError(error, fallbackMessage)

  switch (apiError.status) {
    case 400:
      return apiError.message || 'Проверьте корректность текста комментария.'
    case 403:
      return 'Недостаточно прав для выполнения действия с комментарием.'
    case 404:
      return 'Комментарий или карточка не найдены.'
    default:
      return apiError.message || fallbackMessage
  }
}

const isCommentUpdating = (commentId: number) => {
  return processingCommentId.value === commentId && processingCommentAction.value === 'update'
}

const getCommentAuthor = (comment: RetroItemCommentResponseDto) => {
  return comment.creator.name?.trim() || comment.creator.email
}

const formatCommentDate = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return value
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isCommentAuthor = (comment: RetroItemCommentResponseDto) => {
  return Boolean(currentUserId.value && currentUserId.value === comment.creator.id)
}

const canEditComment = (comment: RetroItemCommentResponseDto) => {
  return isCommentAuthor(comment)
}

const canDeleteComment = (comment: RetroItemCommentResponseDto) => {
  return isCommentAuthor(comment) || canManageCommentsByRole.value
}

const syncCommentsCount = () => {
  retroStore.setItemCommentsCount(props.element.id, comments.value.length)
}

const resetCommentsState = () => {
  commentsLoadRequestId += 1
  comments.value = []
  commentsLoadError.value = ''
  newCommentText.value = ''
  createCommentError.value = ''
  editingCommentId.value = null
  editingCommentText.value = ''
  editingCommentError.value = ''
  processingCommentId.value = null
  processingCommentAction.value = null
  commentActionError.value = ''
  hasLoadedComments.value = false
}

const loadComments = async () => {
  if (props.element.isDraft) {
    comments.value = []
    hasLoadedComments.value = true
    syncCommentsCount()
    return
  }

  const requestId = ++commentsLoadRequestId
  isCommentsLoading.value = true
  commentsLoadError.value = ''

  try {
    const loadedComments = await retroCommentsService.getItemComments(props.element.id)
    if (requestId !== commentsLoadRequestId) return

    comments.value = loadedComments
    hasLoadedComments.value = true
    syncCommentsCount()
  } catch (error) {
    if (requestId !== commentsLoadRequestId) return

    commentsLoadError.value = getCommentApiErrorMessage(error, 'Не удалось загрузить комментарии')
  } finally {
    if (requestId === commentsLoadRequestId) {
      isCommentsLoading.value = false
    }
  }
}

const onCommentsToggleClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()

  isCommentsOpen.value = !isCommentsOpen.value
  if (!isCommentsOpen.value || hasLoadedComments.value || isCommentsLoading.value) {
    return
  }

  void loadComments()
}

watch(
  () => props.element.description,
  (newVal) => {
    editText.value = newVal
  },
)

watch(
  () => props.element.id,
  () => {
    resetCommentsState()

    if (isCommentsOpen.value) {
      void loadComments()
    }
  },
)

function startEditingOnTextAreaClick(e: MouseEvent) {
  e.stopPropagation()
  openEditing()
}

function openEditing() {
  isEditing.value = true
  editText.value = props.element.description
  nextTick(() => {
    textareaRef.value?.focus()
    textareaRef.value?.select()
  })
}

function saveAndClose() {
  void retroStore.updateItemDescription(props.element.id, editText.value.trim())
  textareaRef.value?.blur()
  isEditing.value = false
  if (retroStore.activeItemId === props.element.id) {
    retroStore.setActiveItemId(null)
  }
}

function onDescriptionInput() {
  retroStore.updateItemDescriptionLocal(props.element.id, editText.value)
}

function cancelEditing() {
  editText.value = props.element.description
  isEditing.value = false
  if (retroStore.activeItemId === props.element.id) {
    retroStore.setActiveItemId(null)
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isEditing.value || !cardRef.value) return
  if (!cardRef.value.contains(e.target as Node)) {
    saveAndClose()
  }
}

function onFooterClick(e: MouseEvent) {
  e.stopPropagation()
  startEditingOnTextAreaClick(e)
}

const onLikeButtonClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  retroStore.updateItemLike(props.element.id)
}

const onCreateCommentSubmit = async () => {
  const text = newCommentText.value.trim()
  if (!text || props.element.isDraft) return

  isCreateCommentPending.value = true
  createCommentError.value = ''
  commentActionError.value = ''

  try {
    const createdComment = await retroCommentsService.createItemComment(props.element.id, { text })

    comments.value = [...comments.value, createdComment]
    newCommentText.value = ''
    syncCommentsCount()
    hasLoadedComments.value = true
  } catch (error) {
    createCommentError.value = getCommentApiErrorMessage(error, 'Не удалось создать комментарий')
  } finally {
    isCreateCommentPending.value = false
  }
}

const onStartCommentEditing = (comment: RetroItemCommentResponseDto) => {
  if (!canEditComment(comment)) return

  commentActionError.value = ''
  editingCommentError.value = ''
  editingCommentId.value = comment.id
  editingCommentText.value = comment.text
}

const onCancelCommentEditing = () => {
  editingCommentId.value = null
  editingCommentText.value = ''
  editingCommentError.value = ''
}

const onSaveEditedComment = async (commentId: number) => {
  const text = editingCommentText.value.trim()
  if (!text) {
    editingCommentError.value = 'Комментарий не может быть пустым.'
    return
  }

  processingCommentId.value = commentId
  processingCommentAction.value = 'update'
  editingCommentError.value = ''
  commentActionError.value = ''

  try {
    const updatedComment = await retroCommentsService.updateComment(commentId, { text })

    comments.value = comments.value.map((comment) => {
      if (comment.id !== commentId) return comment
      return updatedComment
    })

    onCancelCommentEditing()
  } catch (error) {
    editingCommentError.value = getCommentApiErrorMessage(error, 'Не удалось обновить комментарий')
  } finally {
    processingCommentId.value = null
    processingCommentAction.value = null
  }
}

const onDeleteComment = async (commentId: number) => {
  const comment = comments.value.find((entry) => entry.id === commentId)
  if (!comment || !canDeleteComment(comment)) return

  processingCommentId.value = commentId
  processingCommentAction.value = 'delete'
  commentActionError.value = ''

  try {
    const response = await retroCommentsService.deleteComment(commentId)
    if (!response.deleted) {
      commentActionError.value = 'Сервер не подтвердил удаление комментария.'
      return
    }

    comments.value = comments.value.filter((comment) => comment.id !== commentId)
    if (editingCommentId.value === commentId) {
      onCancelCommentEditing()
    }
    syncCommentsCount()
  } catch (error) {
    commentActionError.value = getCommentApiErrorMessage(error, 'Не удалось удалить комментарий')
  } finally {
    processingCommentId.value = null
    processingCommentAction.value = null
  }
}

const onMenuButtonClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const onEditCardClick = () => {
  closeMenu()
  openEditing()
}

const onDeleteCardClick = () => {
  closeMenu()
  isDeleteCardModalOpen.value = true
}

const onCloseDeleteCardModal = () => {
  isDeleteCardModalOpen.value = false
}

const onConfirmDeleteCard = () => {
  isDeleteCardModalOpen.value = false
  retroStore.deleteItem(props.element.id)
}

const onCopyTextClick = async () => {
  closeMenu()
  const textToCopy = editText.value.trim()
  if (!textToCopy) return

  try {
    await navigator.clipboard.writeText(textToCopy)
  } catch (error) {
    console.error('Failed to copy card text', error)
  }
}

const onSetColor = (color: string) => {
  retroStore.updateItemColor(props.element.id, color)
}

const onRemoveColor = () => {
  retroStore.updateItemColor(props.element.id, undefined)
}

watch(
  () => retroStore.activeItemId,
  (activeItemId) => {
    if (activeItemId === props.element.id) {
      openEditing()
      return
    }

    if (activeItemId === null && isEditing.value) {
      textareaRef.value?.blur()
      isEditing.value = false
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
