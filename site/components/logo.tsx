export function Logo({ class: className = '', style = '' }: { class?: string; style?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='110 135 280 280'
      width='1em'
      height='1em'
      class={className}
      style={style}
    >
      <g transform='translate(250, 250)'>
        {/* LEFT SIDE */}
        <polygon points='0,-40 -140,-110 -110,-20' fill='currentColor' opacity='0.9' />
        <polygon points='0,-40 -110,-20 -60,30' fill='currentColor' opacity='0.7' />
        <polygon points='0,-40 -60,30 0,0' fill='currentColor' opacity='0.5' />
        <polygon points='-60,30 -40,40 0,0' fill='currentColor' opacity='0.8' />
        <polygon points='-60,30 0,160 -40,40' fill='currentColor' opacity='0.4' />
        <polygon points='-40,40 0,160 0,110' fill='currentColor' opacity='0.6' />

        {/* RIGHT SIDE */}
        <polygon points='0,-40 140,-110 110,-20' fill='currentColor' opacity='0.8' />
        <polygon points='0,-40 110,-20 60,30' fill='currentColor' opacity='0.6' />
        <polygon points='0,-40 60,30 0,0' fill='currentColor' opacity='0.4' />
        <polygon points='60,30 40,40 0,0' fill='currentColor' opacity='0.7' />
        <polygon points='60,30 0,160 40,40' fill='currentColor' opacity='0.3' />
        <polygon points='40,40 0,160 0,110' fill='currentColor' opacity='0.5' />

        {/* CRYSTAL CORE (Using Pico CSS Primary color) */}
        <polygon points='0,0 -40,40 0,50' fill='var(--pico-primary)' opacity='0.9' />
        <polygon points='-40,40 0,110 0,50' fill='var(--pico-primary)' opacity='0.7' />
        <polygon points='0,0 40,40 0,50' fill='var(--pico-primary)' opacity='0.8' />
        <polygon points='40,40 0,110 0,50' fill='var(--pico-primary)' opacity='0.6' />
      </g>
    </svg>
  )
}
