export type TourismCategory = {
  id: string;
  label: string;
  icon: string;
  description: string;
  accent: string;
};

export const TOURISM_CATEGORIES: TourismCategory[] = [
  {
    id: "wildlife-safari",
    label: "Wildlife & Safari",
    icon: "🦁",
    description: "Game drives, Big Five sightings and bush experiences",
    accent: "bg-amber-600",
  },
  {
    id: "nature-adventure",
    label: "Nature & Adventure",
    icon: "🏔️",
    description: "Hiking, abseiling, zip-lining and outdoor thrills",
    accent: "bg-green-600",
  },
  {
    id: "coastal-marine",
    label: "Coastal & Marine",
    icon: "🐋",
    description: "Whale watching, diving, surfing and beach escapes",
    accent: "bg-blue-500",
  },
  {
    id: "culture-heritage",
    label: "Culture & Heritage",
    icon: "🏛️",
    description: "Museums, townships, historical sites and living culture",
    accent: "bg-purple-600",
  },
  {
    id: "events-festivals",
    label: "Events & Festivals",
    icon: "🎉",
    description: "Music festivals, cultural celebrations and public events",
    accent: "bg-pink-500",
  },
  {
    id: "sports-tourism",
    label: "Sports Tourism",
    icon: "🏉",
    description: "Rugby, cricket, football, marathons and sporting events",
    accent: "bg-orange-500",
  },
  {
    id: "food-wine",
    label: "Food & Wine",
    icon: "🍷",
    description: "Wine routes, food tours, braai culture and fine dining",
    accent: "bg-red-600",
  },
  {
    id: "agri-rural",
    label: "Agri & Rural",
    icon: "🌾",
    description: "Farm stays, agri-tourism, rural escapes and harvest experiences",
    accent: "bg-lime-600",
  },
  {
    id: "accommodation",
    label: "Accommodation",
    icon: "🏨",
    description: "Lodges, boutique hotels, glamping and unique stays",
    accent: "bg-teal-600",
  },
  {
    id: "wellness",
    label: "Wellness",
    icon: "🧘",
    description: "Spa retreats, yoga, mindfulness and nature healing",
    accent: "bg-violet-500",
  },
  {
    id: "destinations-tours",
    label: "Destinations & Tours",
    icon: "🗺️",
    description: "Guided tours, road trips and curated destination packages",
    accent: "bg-sky-500",
  },
];
