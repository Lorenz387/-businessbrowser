import { useState, useCallback } from 'react'

const GALLERY_KEY = 'ai_video_studio_gallery'

export function loadGallery() {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveToGallery(item) {
  const gallery = loadGallery()
  gallery.unshift(item)
  localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery.slice(0, 200)))
  return gallery
}

export function toggleFavorite(id) {
  const gallery = loadGallery()
  const updated = gallery.map(v => v.id === id ? { ...v, favorite: !v.favorite } : v)
  localStorage.setItem(GALLERY_KEY, JSON.stringify(updated))
  return updated
}

export function deleteVideo(id) {
  const gallery = loadGallery().filter(v => v.id !== id)
  localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery))
  return gallery
}
