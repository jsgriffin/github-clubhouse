import Bluebird from 'bluebird'

import {createIssue, createIssueComment} from './fetchers/gitHub.js'
import {getStory, listUsers} from './fetchers/clubhouse.js'
import {parseClubhouseStoryURL, parseGithubRepoURL} from './util/urlParse.js'

export {saveConfig, loadConfig} from './util/config.js'

export async function clubhouseStoryToGithubIssue(clubhouseStoryId, repo, options = {}) {
  // _assertOption('githubToken', options)
  _assertOption('clubhouseToken', options)

  const {owner} = parseGithubRepoURL(`${options.githubBase}/${repo}`)

  const clubhouseUsers = await listUsers(options.clubhouseToken)
  const clubhouseUsersById = clubhouseUsers.reduce((acc, user) => {
    acc[user.id.toLowerCase()] = user
    return acc
  })

  const story = await getStory(options.clubhouseToken, clubhouseStoryId)
  const unsavedIssue = _storyToIssue(`${options.clubhouseBase}/stories/${clubhouseStoryId}`, story)
  const unsavedIssueComments = _presentClubhouseComments(story.comments, clubhouseUsersById)

  const issue = await createIssue(options.githubToken, owner, repo, unsavedIssue)
  await Bluebird.each(unsavedIssueComments, comment => createIssueComment(options.githubToken, owner, repo, issue.number, comment))

  return issue
}

function _assertOption(name, options) {
  if (!options[name]) {
    throw new Error(`${name} option must be provided`)
  }
}

/* eslint-disable camelcase */

function _storyToIssue(clubhouseStoryURL, story) {
  const renderedTasks = story.tasks
    .map(task => `- [${task.complete ? 'x' : ' '}] ${task.description}`)
    .join('\n')
  const renderedTasksSection = renderedTasks.length > 0 ? `\n### Tasks\n\n${renderedTasks}` : ''
  const originalStory = `From [ch${story.id}](${clubhouseStoryURL})`

  return {
    title: story.name,
    body: `${originalStory}\n\n${story.description}${renderedTasksSection}`,
  }
}

function _presentClubhouseComments(comments, clubhouseUsersById) {
  return comments.map(comment => {
    const user = clubhouseUsersById[comment.author_id] || {username: comment.author_id}
    return {
      body: `**[Comment from Clubhouse user @${user.username}:]** ${comment.text}`
    }
  })
}
