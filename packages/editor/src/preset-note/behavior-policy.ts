interface NoteBehaviorPolicy {
  placeholder: string
  immediatelyRender: boolean
  defaultSourceMode: boolean
  sourceModeEnabled: boolean
}

export const NOTE_BEHAVIOR_POLICY: NoteBehaviorPolicy = {
  placeholder: '开始记录你的想法',
  immediatelyRender: false,
  defaultSourceMode: false,
  sourceModeEnabled: true,
}
