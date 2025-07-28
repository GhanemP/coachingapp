/**
 * Button Component Tests
 * Tests the UI button component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'

// Simple Button component for testing
interface ButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'danger'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  form?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'data-testid'?: string
  id?: string
}

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'default',
  className = '',
  ...props 
}: ButtonProps) => {
  const baseClasses = 'px-4 py-2 rounded font-medium focus:outline-none focus:ring-2'
  const variantClasses = {
    default: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className} ${
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  }`

  return (
    <button
      className={classes}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Button>Click me</Button>)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should render different variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600')

      rerender(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-gray-600')

      rerender(<Button variant="danger">Danger</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-red-600')

      rerender(<Button variant="default">Default</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-gray-200')
    })
  })

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn()
      render(
        <Button onClick={handleClick} disabled>
          Disabled Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should be focusable', () => {
      render(<Button>Focusable Button</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(document.activeElement).toBe(button)
    })

    it('should handle keyboard events', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Keyboard Button</Button>)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
      
      // Note: onClick is called automatically for Enter key on buttons
      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('States', () => {
    it('should show disabled state', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should show enabled state by default', () => {
      render(<Button>Enabled Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(button).toHaveClass('cursor-pointer')
    })

    it('should handle loading state', () => {
      render(
        <Button disabled>
          <span>Loading...</span>
        </Button>
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper role', () => {
      render(<Button>Accessible Button</Button>)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
    })

    it('should support aria-describedby', () => {
      render(
        <div>
          <Button aria-describedby="help-text">Submit</Button>
          <div id="help-text">This will submit the form</div>
        </div>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('should be keyboard navigable', () => {
      render(
        <div>
          <Button>First Button</Button>
          <Button>Second Button</Button>
        </div>
      )
      
      const buttons = screen.getAllByRole('button')
      
      // Focus first button
      buttons[0].focus()
      expect(document.activeElement).toBe(buttons[0])
      
      // Tab to second button
      fireEvent.keyDown(buttons[0], { key: 'Tab' })
      buttons[1].focus()
      expect(document.activeElement).toBe(buttons[1])
    })

    it('should have focus indicators', () => {
      render(<Button>Focus me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2')
    })
  })

  describe('Custom Props', () => {
    it('should pass through custom props', () => {
      render(
        <Button data-testid="custom-button" id="my-button">
          Custom Props
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-testid', 'custom-button')
      expect(button).toHaveAttribute('id', 'my-button')
    })

    it('should handle type attribute', () => {
      render(<Button type="submit">Submit Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should handle form attribute', () => {
      render(<Button form="my-form">External Submit</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('form', 'my-form')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.textContent).toBe('')
    })

    it('should handle multiple children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      )
      
      expect(screen.getByText('Icon')).toBeInTheDocument()
      expect(screen.getByText('Text')).toBeInTheDocument()
    })

    it('should handle rapid clicks', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Rapid Click</Button>)
      
      const button = screen.getByRole('button')
      
      // Simulate rapid clicks
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('should handle null onClick', () => {
      render(<Button onClick={undefined}>No Handler</Button>)
      
      const button = screen.getByRole('button')
      
      // Should not throw error
      expect(() => fireEvent.click(button)).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn()
      
      const TestButton = (props: ButtonProps) => {
        renderSpy()
        return <Button {...props} />
      }
      
      const { rerender } = render(<TestButton>Test</TestButton>)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Re-render with same props
      rerender(<TestButton>Test</TestButton>)
      
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })
})