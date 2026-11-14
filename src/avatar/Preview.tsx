// Dev preview: /?preview=avatar — the creator plus the current avatar in every pose / expression / bust.
import { useState } from 'react'
import { LANGS, getLang, setLang, useT } from '../i18n'
import { Astronaut } from './Astronaut'
import { AvatarCreator } from './AvatarCreator'
import {
  ASTRONAUT_EXPRESSIONS, ASTRONAUT_POSES, DEFAULT_AVATAR, loadAvatar, randomAvatar,
  type AstronautExpression, type AstronautPose, type AvatarConfig,
} from './types'

const POSE_EXPRESSION: Record<AstronautPose, AstronautExpression> = {
  idle: 'neutral', wave: 'happy', point: 'determined', cheer: 'happy', worried: 'worried', 'thumbs-up': 'happy', float: 'surprised',
}

/** /?preview=avatar&sheet=24 — contact sheet of random avatars, for checking option combinations. */
function Sheet({ count }: { count: number }) {
  const [avatars, setAvatars] = useState(() => Array.from({ length: count }, () => randomAvatar()))
  return (
    <div className="av-preview">
      <section className="av-preview-section">
        <button type="button" className="btn btn--orange" onClick={() => setAvatars(Array.from({ length: count }, () => randomAvatar()))}>RANDOM</button>
        <div className="av-preview-strip" style={{ marginTop: 16 }}>
          {avatars.map((a, i) => {
            const pose = ASTRONAUT_POSES[i % ASTRONAUT_POSES.length]
            return (
              <div key={i} className="panel av-preview-card">
                <Astronaut config={a} pose={pose} expression={ASTRONAUT_EXPRESSIONS[i % ASTRONAUT_EXPRESSIONS.length]} size={300} />
                {a.faceShape} · {a.hair} · {a.helmet}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function Preview() {
  const sheet = Number(new URLSearchParams(location.search).get('sheet'))
  return sheet > 0 ? <Sheet count={sheet} /> : <CreatorPreview />
}

function CreatorPreview() {
  const t = useT()
  const [config, setConfig] = useState<AvatarConfig>(() => loadAvatar() ?? DEFAULT_AVATAR)
  const [done, setDone] = useState('')
  return (
    <div className="av-preview">
      <div className="av-preview-creator">
        <AvatarCreator
          onChange={setConfig}
          onDone={c => { setConfig(c); setDone(t('avatar.preview.done', { name: c.commanderName })) }}
          onBack={() => setDone('onBack')}
        />
      </div>
      <div className="av-preview-bar">
        {LANGS.slice(0, 2).map(l => (
          <button key={l.id} type="button" aria-pressed={getLang() === l.id} onClick={() => setLang(l.id)}>{l.id.toUpperCase()}</button>
        ))}
      </div>
      <section className="av-preview-section">
        {done && <p role="status">{done}</p>}
        <h2>{t('avatar.preview.poses')}</h2>
        <div className="av-preview-strip">
          {ASTRONAUT_POSES.map(pose => (
            <div key={pose} className="panel av-preview-card">
              <Astronaut config={config} pose={pose} expression={POSE_EXPRESSION[pose]} size={230} title={t(`avatar.pose.${pose}`)} />
              {t(`avatar.pose.${pose}`)} · {t(`avatar.expr.${POSE_EXPRESSION[pose]}`)}
            </div>
          ))}
        </div>
        <h2 style={{ marginTop: 24 }}>{t('avatar.preview.expressions')}</h2>
        <div className="av-preview-strip">
          {ASTRONAUT_EXPRESSIONS.map(ex => (
            <div key={ex} className="panel av-preview-card av-preview-card--bust">
              <Astronaut config={config} expression={ex} bust size={128} title={t(`avatar.expr.${ex}`)} />
              {t(`avatar.expr.${ex}`)}
            </div>
          ))}
          <div className="panel av-preview-card av-preview-card--bust">
            <Astronaut config={config} expression="happy" bust size={56} animate={false} />
            56px
          </div>
        </div>
      </section>
    </div>
  )
}
