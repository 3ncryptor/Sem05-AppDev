/**
 * Pure helpers for People and New group: search, finding an existing DM,
 * selection and the "can we create this group" rule.
 */

export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_NAME = 60;

/**
 * People matching a search, alphabetical, with you first.
 * @param {{ id: string, name: string }[]} users
 * @param {string} query
 * @param {string} myId
 */
export function filterPeople(users, query, myId) {
  const needle = query.trim().toLowerCase();
  return users
    .filter((user) => !needle || user.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * The existing DM between me and another person, if any.
 * @param {{ id: string, type: string, participants_ids: string[] }[]} conversations
 * @param {string} myId
 * @param {string} otherId
 */
export function findDirectChat(conversations, myId, otherId) {
  return conversations.find(
    (item) =>
      item.type !== 'GROUP' &&
      item.participants_ids.length === 2 &&
      item.participants_ids.includes(myId) &&
      item.participants_ids.includes(otherId),
  );
}

/**
 * Adds or removes an id, returning a new list.
 * @param {string[]} ids
 * @param {string} id
 */
export function toggleId(ids, id) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

/**
 * Why the group cannot be created yet, or '' when it can.
 * @param {string} name
 * @param {string[]} selectedIds people other than me
 */
export function groupFormProblem(name, selectedIds) {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the group a name.';
  if (trimmed.length > MAX_GROUP_NAME) return `Keep the name under ${MAX_GROUP_NAME} characters.`;
  if (selectedIds.length < MIN_GROUP_MEMBERS) return `Pick at least ${MIN_GROUP_MEMBERS} people.`;
  return '';
}
