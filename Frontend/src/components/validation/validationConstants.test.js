import { describe, expect, it } from 'vitest'

import {
  COTATION_OPTIONS,
  isEtatField,
  isMeasuredResultField,
  isResultCommentField,
} from './validationConstants'

describe('validationConstants', () => {
  it('keeps the expected cotation order', () => {
    expect(COTATION_OPTIONS.slice(0, 4)).toEqual([
      'A_coter',
      'OK',
      'NOK_mineur',
      'NOK',
    ])
    expect(COTATION_OPTIONS).toHaveLength(5)
  })

  it('detects status columns', () => {
    expect(isEtatField('ETAT')).toBe(true)
    expect(isEtatField('Etat')).toBe(true)
    expect(isEtatField('Status')).toBe(false)
  })

  it('detects measured result columns', () => {
    expect(isMeasuredResultField('Resultat Mesure (Resultats)')).toBe(true)
    expect(isMeasuredResultField('Commentaire')).toBe(false)
  })

  it('detects result comment columns', () => {
    expect(isResultCommentField('Resultat Attendu')).toBe(true)
    expect(isResultCommentField('Resultat mesure (Resultats)')).toBe(true)
    expect(isResultCommentField('Cotation')).toBe(false)
  })
})
