import {
  Activity,
  Bike,
  Building2,
  CircleDot,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  HeartPulse,
  Leaf,
  Mountain,
  MountainSnow,
  Music2,
  Orbit,
  PersonStanding,
  Sailboat,
  Shield,
  Snowflake,
  Trophy,
  Waves,
  Zap,
} from "lucide-react";

const fallbackIcon = Activity;

const iconMap = {
  activity: Activity,
  bike: Bike,
  "building-2": Building2,
  "circle-dot": CircleDot,
  dumbbell: Dumbbell,
  flame: Flame,
  "flower-2": Flower2,
  footprints: Footprints,
  "heart-pulse": HeartPulse,
  leaf: Leaf,
  mountain: Mountain,
  "mountain-snow": MountainSnow,
  "music-2": Music2,
  orbit: Orbit,
  running: PersonStanding,
  sailboat: Sailboat,
  shield: Shield,
  "shield-half": Shield,
  snowflake: Snowflake,
  trophy: Trophy,
  waves: Waves,
  "waves-ladder": Waves,
  zap: Zap,
};

export function getActivityIcon(iconName) {
  return iconMap[iconName] || fallbackIcon;
}
