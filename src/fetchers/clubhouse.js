import Clubhouse from 'clubhouse-lib'

function apiClient(token) {
  return Clubhouse.create(token)
}

export function getStory(token, storyId) {
  return apiClient(token).getStory(storyId)
}

export function listUsers(token) {
  return apiClient(token).listMembers()
}
