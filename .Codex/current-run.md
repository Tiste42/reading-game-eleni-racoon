# V2.2 Apple audio hotfix candidate - 2026-08-07

## Incident

- Production MP3 files were valid, but the iPhone/iPad installed-PWA path forced
  every channel through WebAudio. WebKit can leave that AudioContext reporting
  `running` while routing no sound to the speakers after launch or resume.
- The voice/sound switch was not connected to speech or effects, and the
  one-shot recovery path could permanently believe audio was unlocked.

## Candidate repair

- Apple mobile/PWAs use three reusable native media channels for music, speech,
  and effects. Sources are refreshed after foreground/session loss and every
  later trusted gesture can recover playback.
- Speech ducking pauses/resumes music at its existing position. Music enable is
  started inside the toggle tap. Apple settings use device volume controls.
- Desktop browsers retain Howler/WebAudio. Existing progress migrates to store
  version 5 without resetting learning history.
- Regression coverage checks non-silent decoded playback, advancing native
  playback time, real Play, voice/music/effect toggles, foreground recovery,
  audio warnings, and all runtime music/effect files.

## Release authority

Do not infer production status from this file. Release requires clean lint,
typecheck, unit, content, production build, full browser QA, independent review,
the candidate commit on `origin/main`, a matching Vercel `READY` production
deployment, and public-route verification. A physical Apple speaker check is a
separate final confirmation and must not be claimed from emulation.
