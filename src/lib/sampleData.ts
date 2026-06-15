import type { QuestionBank } from '../types'
import { generateId } from './storage'

// A small sample bank so the app is not empty on first launch.
// Users can edit or delete it freely.
export function createSampleBank(): QuestionBank {
  const now = Date.now()
  const make = (
    category: string,
    points: number,
    question: string,
    answer: string,
  ) => ({ id: generateId(), category, points, question, answer })

  return {
    id: generateId(),
    name: 'Sample Review: Intro Biology',
    description: 'A demo question bank you can edit or delete.',
    createdAt: now,
    updatedAt: now,
    questions: [
      make('The Cell', 100, 'This organelle is known as the "powerhouse of the cell".', 'The mitochondrion'),
      make('The Cell', 200, 'The control center of the cell that contains DNA.', 'The nucleus'),
      make('The Cell', 300, 'The process by which cells make copies of themselves.', 'Mitosis (cell division)'),
      make('The Cell', 400, 'The semi-permeable barrier surrounding the cell.', 'The cell (plasma) membrane'),

      make('Genetics', 100, 'The molecule that carries genetic instructions.', 'DNA'),
      make('Genetics', 200, 'A segment of DNA that codes for a trait.', 'A gene'),
      make('Genetics', 300, 'The scientist known as the "father of genetics".', 'Gregor Mendel'),
      make('Genetics', 400, 'The two-letter abbreviation for the sugar-phosphate molecule that pairs with adenine.', 'T (thymine)'),

      make('Ecology', 100, 'Organisms that make their own food via photosynthesis.', 'Producers (autotrophs)'),
      make('Ecology', 200, 'All the living and non-living things in an area.', 'An ecosystem'),
      make('Ecology', 300, 'The role or job of an organism in its environment.', 'Its niche'),
      make('Ecology', 400, 'The process plants use to convert sunlight into energy.', 'Photosynthesis'),
    ],
  }
}
