import assert from 'node:assert/strict'
import test from 'node:test'
import { AUDIO_FORMATS, buildAudioOptions, buildDownloadOptions } from './formats.js'

const videoInfo = {
  formats: [
    { format_id: '18', ext: 'mp4', height: 360, vcodec: 'avc1', acodec: 'mp4a', filesize: 500 },
    { format_id: '137', ext: 'mp4', height: 1080, vcodec: 'avc1', acodec: 'none', filesize: 1500 },
    { format_id: '140', ext: 'm4a', acodec: 'mp4a', abr: 128, vcodec: 'none' },
    { format_id: '251', ext: 'webm', acodec: 'opus', abr: 128, vcodec: 'none' },
    { format_id: '248', ext: 'webm', height: 1440, vcodec: 'vp9', acodec: 'none', filesize: 1200 },
  ],
}

test('video choices keep progressive and merged resolutions, including WebM', () => {
  const options = buildDownloadOptions(videoInfo, { hasFfmpeg: true, platform: 'youtube' })

  assert.ok(options.some((option) => option.resolution === '360p' && option.progressive))
  assert.ok(options.some((option) => option.resolution === '1080p' && option.formatId === '137+140'))
  assert.ok(options.some((option) => option.resolution === '1440p' && option.formatId === '248+251' && option.ext === 'webm'))
})

test('without FFmpeg, only video formats that already include audio are offered', () => {
  const options = buildDownloadOptions(videoInfo, { hasFfmpeg: false, platform: 'youtube' })

  assert.equal(options.length, 1)
  assert.equal(options[0].formatId, '18')
  assert.equal(options[0].progressive, true)
})

test('audio choices expose requested formats and bitrates only when FFmpeg is available', () => {
  const options = buildAudioOptions(videoInfo, { hasFfmpeg: true })

  assert.deepEqual(options.map((option) => option.audioFormat), AUDIO_FORMATS.map((format) => format.id))
  assert.deepEqual(options.find((option) => option.audioFormat === 'mp3').bitrates, [128, 192, 256, 320])
  assert.deepEqual(options.find((option) => option.audioFormat === 'wav').bitrates, [])
  assert.deepEqual(buildAudioOptions(videoInfo, { hasFfmpeg: false }), [])
})

test('audio choices are omitted when the source has no audio stream', () => {
  const info = { formats: [{ format_id: '137', vcodec: 'avc1', acodec: 'none', height: 1080 }] }

  assert.deepEqual(buildAudioOptions(info, { hasFfmpeg: true }), [])
})
