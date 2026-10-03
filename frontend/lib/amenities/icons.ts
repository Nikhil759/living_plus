import {
  faDumbbell,
  faFeatherPointed,
  faLandmark,
  faLocationDot,
  faMasksTheater,
  faMugSaucer,
  faPersonSwimming,
  faTableTennisPaddleBall,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

const BY_KEYWORD: Array<[string, IconDefinition]> = [
  ["badminton", faFeatherPointed],
  ["tennis", faTableTennisPaddleBall],
  ["gym", faDumbbell],
  ["pool", faPersonSwimming],
  ["café", faMugSaucer],
  ["cafe", faMugSaucer],
  ["amphitheatre", faMasksTheater],
  ["amphitheater", faMasksTheater],
  ["hall", faLandmark],
];

/** Font Awesome icon for a society amenity, matched on the name. */
export function amenityIcon(name: string): IconDefinition {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of BY_KEYWORD) {
    if (lower.includes(keyword)) return icon;
  }
  return faLocationDot;
}
