export type Destination = {
  id: string;
  name: string;
};

export type Province = {
  id: string;
  name: string;
  destinations: Destination[];
};

export const PROVINCES: Province[] = [
  {
    id: "gauteng",
    name: "Gauteng",
    destinations: [
      { id: "johannesburg", name: "Johannesburg" },
      { id: "pretoria", name: "Pretoria" },
      { id: "soweto", name: "Soweto" },
      { id: "cradle-of-humankind", name: "Cradle of Humankind" },
    ],
  },
  {
    id: "western-cape",
    name: "Western Cape",
    destinations: [
      { id: "cape-town", name: "Cape Town" },
      { id: "stellenbosch", name: "Stellenbosch" },
      { id: "franschhoek", name: "Franschhoek" },
      { id: "garden-route", name: "Garden Route" },
      { id: "hermanus", name: "Hermanus" },
    ],
  },
  {
    id: "kwazulu-natal",
    name: "KwaZulu-Natal",
    destinations: [
      { id: "durban", name: "Durban" },
      { id: "drakensberg", name: "Drakensberg" },
      { id: "st-lucia", name: "St Lucia" },
      { id: "hluhluwe", name: "Hluhluwe" },
    ],
  },
  {
    id: "mpumalanga",
    name: "Mpumalanga",
    destinations: [
      { id: "kruger-national-park", name: "Kruger National Park" },
      { id: "blyde-river-canyon", name: "Blyde River Canyon" },
      { id: "panorama-route", name: "Panorama Route" },
      { id: "sabie", name: "Sabie" },
    ],
  },
  {
    id: "limpopo",
    name: "Limpopo",
    destinations: [
      { id: "polokwane", name: "Polokwane" },
      { id: "waterberg", name: "Waterberg" },
      { id: "mapungubwe", name: "Mapungubwe" },
      { id: "bela-bela", name: "Bela-Bela" },
    ],
  },
  {
    id: "eastern-cape",
    name: "Eastern Cape",
    destinations: [
      { id: "addo-elephant-park", name: "Addo Elephant Park" },
      { id: "wild-coast", name: "Wild Coast" },
      { id: "jeffreys-bay", name: "Jeffrey's Bay" },
      { id: "port-elizabeth", name: "Port Elizabeth" },
    ],
  },
  {
    id: "free-state",
    name: "Free State",
    destinations: [
      { id: "golden-gate", name: "Golden Gate" },
      { id: "clarens", name: "Clarens" },
      { id: "bloemfontein", name: "Bloemfontein" },
    ],
  },
  {
    id: "north-west",
    name: "North West",
    destinations: [
      { id: "sun-city", name: "Sun City" },
      { id: "pilanesberg", name: "Pilanesberg" },
      { id: "madikwe", name: "Madikwe" },
      { id: "rustenburg", name: "Rustenburg" },
    ],
  },
  {
    id: "northern-cape",
    name: "Northern Cape",
    destinations: [
      { id: "kgalagadi", name: "Kgalagadi" },
      { id: "augrabies-falls", name: "Augrabies Falls" },
      { id: "namaqualand", name: "Namaqualand" },
      { id: "kimberley", name: "Kimberley" },
    ],
  },
];
