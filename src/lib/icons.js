import { Books as BooksIcon } from '@phosphor-icons/react/dist/ssr/Books';
import { Calculator as CalculatorIcon } from '@phosphor-icons/react/dist/ssr/Calculator';
import { Microscope as MicroscopeIcon } from '@phosphor-icons/react/dist/ssr/Microscope';
import { Dna as DnaIcon } from '@phosphor-icons/react/dist/ssr/Dna';
import { Palette as PaletteIcon } from '@phosphor-icons/react/dist/ssr/Palette';
import { Bank as BankIcon } from '@phosphor-icons/react/dist/ssr/Bank';
import { Laptop as LaptopIcon } from '@phosphor-icons/react/dist/ssr/Laptop';
import { Globe as GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { Strategy as StrategyIcon } from '@phosphor-icons/react/dist/ssr/Strategy';
import { MusicNotes as MusicNotesIcon } from '@phosphor-icons/react/dist/ssr/MusicNotes';
import { Scales as ScalesIcon } from '@phosphor-icons/react/dist/ssr/Scales';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Brain as BrainIcon } from '@phosphor-icons/react/dist/ssr/Brain';
import { ChartBar as ChartBarIcon } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

const ICON_MAP = {
  'Books': BooksIcon,
  'Calculator': CalculatorIcon,
  'Microscope': MicroscopeIcon,
  'Dna': DnaIcon,
  'Palette': PaletteIcon,
  'Bank': BankIcon,
  'Laptop': LaptopIcon,
  'Globe': GlobeIcon,
  'Strategy': StrategyIcon,
  'MusicNotes': MusicNotesIcon,
  'Scales': ScalesIcon,
  'Briefcase': BriefcaseIcon,
  'Brain': BrainIcon,
  'ChartBar': ChartBarIcon,
  'Wrench': WrenchIcon,
  '📚': BooksIcon,
  '🧮': CalculatorIcon,
  '🔬': MicroscopeIcon,
  '🧬': DnaIcon,
  '🎨': PaletteIcon,
  '🏛️': BankIcon,
  '💻': LaptopIcon,
  '🌍': GlobeIcon,
  '📐': StrategyIcon,
  '🎵': MusicNotesIcon,
  '⚖️': ScalesIcon,
  '💼': BriefcaseIcon,
  '🧠': BrainIcon,
  '📊': ChartBarIcon,
  '🔧': WrenchIcon,
};

export const ICONS = ['Books', 'Calculator', 'Microscope', 'Dna', 'Palette', 'Bank', 'Laptop', 'Globe', 'Strategy', 'MusicNotes', 'Scales', 'Briefcase', 'Brain', 'ChartBar', 'Wrench'];

export function renderIcon(iconName) {
  const IconComponent = ICON_MAP[iconName] || BooksIcon;
  return <IconComponent weight="fill" />;
}
