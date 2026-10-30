import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export type PeriodSelectorOption = { value: string; label: string }

type PeriodSelectorProps = {
  options: PeriodSelectorOption[]
  value: string | null
  onChange: (value: string) => void
  label: string
}

export function PeriodSelector({ options, value, onChange, label }: PeriodSelectorProps) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, nextValue: string | null) => nextValue && onChange(nextValue)}
      aria-label={label}
      sx={(theme) => ({
        alignSelf: 'flex-start',
        display: 'inline-flex',
        width: 'fit-content',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '18px',
        bgcolor: theme.palette.background.paper,
        overflow: 'hidden',
        '& .MuiToggleButtonGroup-grouped': {
          height: 36,
          minHeight: 36,
          px: 2,
          border: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.secondary,
          fontSize: '0.8125rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          '&:last-of-type': { borderRight: 0 },
          '&:hover': { bgcolor: '#F1F2FA' },
          '&.Mui-selected': {
            bgcolor: '#7C82C9',
            color: theme.palette.common.white,
            fontWeight: 600,
            '&:hover': { bgcolor: '#7C82C9' },
          },
        },
      })}
    >
      {options.map((option) => <ToggleButton key={option.value} value={option.value}>{option.label}</ToggleButton>)}
    </ToggleButtonGroup>
  )
}
