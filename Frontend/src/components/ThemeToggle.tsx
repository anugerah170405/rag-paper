import { useTheme } from '@/hooks/useTheme'
import Button from './ui/Buttons'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      onClick={toggleTheme}
      variant='outline'
      size='sm'
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      leftIcon={
       theme === 'dark' ?<Moon size={16}/> :<Sun size={16}/>
      }
    >
      {/* {theme === 'dark' ? '🌙 Dark' : '☀️ Light'} */}
    </Button>
  )
}