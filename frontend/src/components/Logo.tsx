import { motion } from 'framer-motion'

interface LogoProps {
  size?: number
  animate?: boolean
  className?: string
}

export default function Logo({ size = 48, animate = false, className = '' }: LogoProps) {
  if (animate) {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className={className}
      >
        <img src="/favicon.svg" width={size} height={size} alt="Logo" />
      </motion.div>
    )
  }

  return <img src="/favicon.svg" width={size} height={size} alt="Logo" className={className} />
}
