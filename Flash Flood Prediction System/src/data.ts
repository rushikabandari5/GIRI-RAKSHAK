export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface Village {
  name: string;
  risk: RiskLevel;
  rainfall: number;
  soilMoisture: number;
  slopeStability: number;
  population: number;
  lat: number;
  lng: number;
  evacuationRoute: string;
  nearestShelter: string;
  shelterDistance: number;
}

export interface District {
  name: string;
  risk: RiskLevel;
  villages: Village[];
  rainfall: number;
  soilMoisture: number;
  sensors: number;
}

export interface State {
  name: string;
  code: string;
  risk: RiskLevel;
  districts: District[];
  color: string;
  mapX: number;
  mapY: number;
}

const makeVillage = (
  name: string, risk: RiskLevel, rainfall: number, sm: number, ss: number, pop: number,
  lat: number, lng: number, route: string, shelter: string, dist: number
): Village => ({
  name, risk, rainfall, soilMoisture: sm, slopeStability: ss, population: pop,
  lat, lng, evacuationRoute: route, nearestShelter: shelter, shelterDistance: dist
});

export const statesData: State[] = [
  {
    name: "Uttarakhand", code: "UK", risk: "critical", color: "#ef4444", mapX: 28, mapY: 22,
    districts: [
      {
        name: "Chamoli", risk: "critical", rainfall: 187, soilMoisture: 91, sensors: 14,
        villages: [
          makeVillage("Gopeshwar", "critical", 187, 91, 24, 2890, 30.41, 79.31, "NH-7 → Karnprayag → Rishikesh", "Karnprayag Relief Camp", 34),
          makeVillage("Joshimath", "critical", 201, 95, 18, 16309, 30.55, 79.56, "NH-58 → Pipalkoti → Chamoli", "Pipalkoti Shelter", 18),
          makeVillage("Niti", "high", 143, 82, 38, 412, 30.74, 79.84, "Forest road → Badrinath road", "Pandukeshwar Camp", 22),
          makeVillage("Mana", "high", 156, 87, 31, 230, 30.80, 79.89, "NH-58 backward route", "Badrinath Town", 4),
          makeVillage("Tapoban", "medium", 98, 74, 52, 1240, 30.52, 79.61, "Local road → Joshimath", "Joshimath Camp", 8),
          makeVillage("Helang", "low", 67, 61, 68, 890, 30.48, 79.58, "NH-58 Main road", "Pipalkoti", 12),
        ]
      },
      {
        name: "Pithoragarh", risk: "high", rainfall: 134, soilMoisture: 84, sensors: 11,
        villages: [
          makeVillage("Munsiyari", "high", 134, 84, 35, 4700, 30.06, 80.24, "Pithoragarh highway", "Pithoragarh Relief Hub", 98),
          makeVillage("Dharchula", "high", 122, 79, 41, 8200, 29.85, 80.54, "NH-125 → Pithoragarh", "Tanakpur Base Camp", 110),
          makeVillage("Berinag", "medium", 89, 71, 56, 3200, 29.88, 80.13, "State highway", "Pithoragarh Town", 45),
          makeVillage("Thal", "medium", 76, 68, 62, 2800, 29.97, 80.34, "NH-125", "Pithoragarh", 62),
        ]
      },
      {
        name: "Rudraprayag", risk: "high", rainfall: 163, soilMoisture: 88, sensors: 9,
        villages: [
          makeVillage("Ukhimath", "high", 163, 88, 29, 3100, 30.52, 79.10, "Tilwara → Rudraprayag NH", "Agastmuni Camp", 28),
          makeVillage("Augustmuni", "medium", 112, 76, 47, 4200, 30.45, 79.08, "NH-107 → Rishikesh", "Srinagar Town", 35),
          makeVillage("Kedarnath Road", "critical", 198, 93, 22, 600, 30.73, 79.06, "Emergency helipad Phata → Guptkashi", "Phata Helipad", 14),
        ]
      },
      {
        name: "Tehri Garhwal", risk: "medium", rainfall: 94, soilMoisture: 73, sensors: 8,
        villages: [
          makeVillage("New Tehri", "medium", 94, 73, 55, 25000, 30.37, 78.48, "NH-58 → Dehradun / Haridwar", "Dehradun", 93),
          makeVillage("Ghansali", "low", 61, 58, 72, 6800, 30.41, 78.61, "State highway", "New Tehri", 38),
          makeVillage("Pratapnagar", "medium", 87, 69, 49, 3400, 30.44, 78.68, "State road → New Tehri", "New Tehri Camp", 28),
        ]
      },
      {
        name: "Bageshwar", risk: "medium", rainfall: 108, soilMoisture: 77, sensors: 7,
        villages: [
          makeVillage("Bageshwar Town", "medium", 108, 77, 48, 9220, 29.83, 79.77, "NH-309A → Almora", "Almora Camp", 78),
          makeVillage("Kapkote", "high", 131, 83, 37, 2100, 30.01, 79.74, "State road → Bageshwar", "Bageshwar Town", 34),
        ]
      }
    ]
  },
  {
    name: "Himachal Pradesh", code: "HP", risk: "high", color: "#f97316", mapX: 22, mapY: 18,
    districts: [
      {
        name: "Kinnaur", risk: "high", rainfall: 118, soilMoisture: 81, sensors: 12,
        villages: [
          makeVillage("Reckong Peo", "high", 118, 81, 38, 6200, 31.54, 78.27, "NH-5 → Rampur → Shimla", "Rampur Relief Camp", 120),
          makeVillage("Sangla", "high", 134, 86, 32, 1800, 31.41, 78.24, "State road → Reckong Peo", "Reckong Peo Town", 18),
          makeVillage("Kalpa", "medium", 92, 74, 51, 2100, 31.52, 78.26, "NH-5", "Reckong Peo", 11),
          makeVillage("Chitkul", "high", 141, 89, 28, 310, 31.35, 78.41, "Sangla valley road", "Sangla Camp", 24),
        ]
      },
      {
        name: "Lahaul Spiti", risk: "medium", rainfall: 43, soilMoisture: 56, sensors: 8,
        villages: [
          makeVillage("Kaza", "medium", 43, 56, 64, 2200, 32.22, 78.07, "Manali-Leh road", "Manali Base", 195),
          makeVillage("Keylong", "low", 31, 49, 74, 3100, 32.55, 77.02, "NH-21 → Manali", "Manali Town", 115),
        ]
      },
      {
        name: "Kullu", risk: "high", rainfall: 142, soilMoisture: 83, sensors: 10,
        villages: [
          makeVillage("Kasol", "high", 142, 83, 33, 1400, 32.00, 77.32, "Bhuntar → Chandigarh highway", "Bhuntar Camp", 28),
          makeVillage("Manikaran", "critical", 168, 92, 21, 2800, 32.03, 77.35, "Emergency: Bhuntar direct", "Bhuntar Shelter", 32),
          makeVillage("Manali", "medium", 98, 74, 52, 8020, 32.24, 77.19, "NH-21 → Mandi", "Mandi Town", 98),
          makeVillage("Nagar", "medium", 87, 71, 55, 3200, 32.12, 77.13, "Old Manali road → Kullu", "Kullu Town", 62),
        ]
      },
      {
        name: "Chamba", risk: "high", rainfall: 128, soilMoisture: 80, sensors: 9,
        villages: [
          makeVillage("Chamba Town", "medium", 98, 74, 49, 22000, 32.55, 76.12, "NH-154 → Pathankot", "Pathankot Base", 184),
          makeVillage("Bharmour", "high", 128, 80, 35, 4800, 32.44, 76.53, "Chamba road", "Chamba Town", 65),
          makeVillage("Pangi", "high", 141, 87, 28, 1200, 32.98, 76.85, "Helicopter only / Kilar road", "Chamba Hospital", 94),
        ]
      },
      {
        name: "Mandi", risk: "medium", rainfall: 103, soilMoisture: 76, sensors: 8,
        villages: [
          makeVillage("Mandi Town", "low", 78, 64, 66, 26422, 31.71, 76.93, "NH-21 → Chandigarh", "Chandigarh", 195),
          makeVillage("Jogindernagar", "medium", 103, 76, 48, 8200, 31.99, 76.79, "State road → Mandi", "Mandi Town", 42),
        ]
      }
    ]
  },
  {
    name: "Arunachal Pradesh", code: "AR", risk: "critical", color: "#ef4444", mapX: 88, mapY: 28,
    districts: [
      {
        name: "Tawang", risk: "critical", rainfall: 221, soilMoisture: 94, sensors: 8,
        villages: [
          makeVillage("Tawang Town", "critical", 221, 94, 19, 12000, 27.59, 91.86, "Bomdila → Guwahati (NH-13)", "Bomdila Relief Centre", 178),
          makeVillage("Jang", "critical", 198, 91, 22, 980, 27.78, 91.72, "Tawang-Bomdila road", "Tawang Town Camp", 24),
          makeVillage("Lumla", "high", 156, 87, 34, 1200, 27.44, 91.72, "Border road → Tawang", "Tawang Camp", 35),
          makeVillage("Zemithang", "high", 167, 89, 28, 640, 27.89, 91.62, "BRO road", "Tawang", 48),
        ]
      },
      {
        name: "West Siang", risk: "high", rainfall: 186, soilMoisture: 88, sensors: 10,
        villages: [
          makeVillage("Along", "high", 186, 88, 31, 12000, 28.17, 94.80, "NH-229 → Dibrugarh", "Dibrugarh Base", 245),
          makeVillage("Daporijo", "high", 172, 85, 35, 6800, 27.97, 94.22, "State highway", "Along Town", 98),
          makeVillage("Rumgong", "medium", 134, 79, 48, 1400, 28.22, 95.12, "Local BRO road", "Along Camp", 42),
        ]
      },
      {
        name: "East Siang", risk: "high", rainfall: 178, soilMoisture: 86, sensors: 9,
        villages: [
          makeVillage("Pasighat", "medium", 131, 78, 47, 20000, 28.07, 95.33, "NH-52 → Dibrugarh", "Dibrugarh", 192),
          makeVillage("Mebo", "high", 178, 86, 33, 3400, 28.14, 95.40, "State road → Pasighat", "Pasighat Camp", 18),
        ]
      },
      {
        name: "Papum Pare", risk: "medium", rainfall: 132, soilMoisture: 79, sensors: 11,
        villages: [
          makeVillage("Itanagar", "low", 98, 68, 62, 44971, 27.08, 93.60, "NH-415 → Guwahati", "Guwahati", 182),
          makeVillage("Naharlagun", "medium", 132, 79, 49, 30000, 27.10, 93.69, "NH-415", "Guwahati NDRF", 180),
          makeVillage("Yupia", "medium", 118, 76, 52, 5600, 27.11, 93.72, "NH-415", "Naharlagun Camp", 8),
        ]
      },
      {
        name: "Kurung Kumey", risk: "critical", rainfall: 234, soilMoisture: 96, sensors: 6,
        villages: [
          makeVillage("Koloriang", "critical", 234, 96, 17, 3200, 28.02, 93.37, "Helicopter recommended / NH-13 to Ziro", "Ziro Relief Camp", 142),
          makeVillage("Sarli", "critical", 218, 93, 20, 1100, 28.14, 93.42, "Emergency helicopter", "Koloriang Helipad", 34),
          makeVillage("Palin", "high", 167, 87, 31, 2800, 27.87, 93.60, "Daporijo road", "Ziro Camp", 98),
        ]
      }
    ]
  },
  {
    name: "Meghalaya", code: "ML", risk: "critical", color: "#ef4444", mapX: 74, mapY: 40,
    districts: [
      {
        name: "East Khasi Hills", risk: "critical", rainfall: 289, soilMoisture: 97, sensors: 14,
        villages: [
          makeVillage("Shillong", "high", 198, 84, 42, 143229, 25.58, 91.88, "NH-44 → Guwahati", "Guwahati NDRF HQ", 98),
          makeVillage("Cherrapunji (Sohra)", "critical", 289, 97, 14, 9000, 25.28, 91.72, "Emergency: NH-6 → Shillong", "Shillong Cantonment", 56),
          makeVillage("Mawsynram", "critical", 312, 98, 12, 4200, 25.30, 91.58, "State road → Shillong", "Shillong Camp", 64),
          makeVillage("Mawphlang", "high", 187, 88, 36, 2100, 25.44, 91.73, "State highway", "Shillong Town", 29),
          makeVillage("Dawki", "high", 201, 91, 28, 4800, 25.19, 92.02, "NH-6 → Shillong / Bangladesh border road", "Jowai Camp", 48),
        ]
      },
      {
        name: "West Khasi Hills", risk: "high", rainfall: 168, soilMoisture: 86, sensors: 9,
        villages: [
          makeVillage("Nongstoin", "high", 168, 86, 33, 12000, 25.52, 91.27, "NH-106 → Shillong", "Shillong", 78),
          makeVillage("Mairang", "medium", 121, 77, 49, 8400, 25.56, 91.68, "NH-44 → Shillong", "Shillong", 35),
          makeVillage("Mawkyrwat", "high", 154, 84, 37, 5200, 25.31, 91.26, "State road → Nongstoin", "Nongstoin Camp", 42),
        ]
      },
      {
        name: "Ri Bhoi", risk: "medium", rainfall: 124, soilMoisture: 78, sensors: 8,
        villages: [
          makeVillage("Nongpoh", "medium", 124, 78, 47, 9800, 25.91, 91.87, "NH-44 → Guwahati", "Guwahati", 55),
          makeVillage("Umiam", "low", 87, 66, 63, 3400, 25.67, 91.98, "NH-44", "Guwahati", 38),
        ]
      },
      {
        name: "South Garo Hills", risk: "high", rainfall: 172, soilMoisture: 87, sensors: 7,
        villages: [
          makeVillage("Baghmara", "high", 172, 87, 31, 7200, 25.20, 90.64, "NH-62 → Tura", "Tura Relief Centre", 88),
          makeVillage("Rongara", "medium", 118, 76, 48, 2800, 25.31, 90.71, "State road", "Baghmara Camp", 22),
        ]
      },
      {
        name: "East Jaintia Hills", risk: "critical", rainfall: 241, soilMoisture: 95, sensors: 8,
        villages: [
          makeVillage("Khliehriat", "critical", 241, 95, 18, 6800, 25.23, 92.43, "NH-6 → Shillong", "Shillong NDRF", 124),
          makeVillage("Amlarem", "critical", 228, 93, 21, 3200, 25.22, 92.30, "State road → Jowai", "Jowai Camp", 34),
          makeVillage("Laskein", "high", 178, 88, 29, 1800, 25.26, 92.56, "Local road", "Khliehriat", 28),
        ]
      }
    ]
  },
  {
    name: "Sikkim", code: "SK", risk: "critical", color: "#ef4444", mapX: 66, mapY: 30,
    districts: [
      {
        name: "North Sikkim", risk: "critical", rainfall: 198, soilMoisture: 93, sensors: 9,
        villages: [
          makeVillage("Mangan", "critical", 198, 93, 21, 8200, 27.51, 88.52, "NH-10 → Gangtok", "Gangtok Relief Camp", 64),
          makeVillage("Lachen", "high", 154, 87, 34, 1200, 27.73, 88.55, "State road → Mangan", "Mangan Town", 32),
          makeVillage("Lachung", "high", 167, 89, 31, 980, 27.69, 88.74, "State road → Mangan", "Mangan Camp", 38),
          makeVillage("Chungthang", "critical", 212, 95, 18, 2100, 27.61, 88.64, "NH-10 → Mangan emergency route", "Mangan Camp", 22),
        ]
      },
      {
        name: "East Sikkim", risk: "high", rainfall: 142, soilMoisture: 82, sensors: 11,
        villages: [
          makeVillage("Gangtok", "medium", 112, 74, 51, 100000, 27.33, 88.61, "NH-10 → Siliguri", "Siliguri NDRF Base", 124),
          makeVillage("Pakyong", "medium", 98, 72, 54, 15000, 27.23, 88.60, "Airport road → Siliguri", "Siliguri", 108),
          makeVillage("Rongli", "high", 142, 82, 36, 5600, 27.21, 88.82, "State road → Gangtok", "Gangtok Camp", 42),
        ]
      },
      {
        name: "South Sikkim", risk: "high", rainfall: 158, soilMoisture: 85, sensors: 8,
        villages: [
          makeVillage("Namchi", "medium", 118, 76, 48, 18000, 27.17, 88.36, "NH-717A → Siliguri", "Siliguri", 112),
          makeVillage("Ravangla", "high", 158, 85, 33, 4200, 27.30, 88.37, "State road → Namchi", "Namchi Town", 28),
        ]
      },
      {
        name: "West Sikkim", risk: "critical", rainfall: 204, soilMoisture: 94, sensors: 7,
        villages: [
          makeVillage("Gyalshing", "critical", 204, 94, 19, 8800, 27.28, 88.26, "State road → Siliguri", "Siliguri NDRF", 134),
          makeVillage("Yuksom", "high", 167, 88, 29, 1100, 27.47, 88.26, "Trekking route / helicopter", "Gyalshing Camp", 38),
          makeVillage("Khecheopalri", "high", 178, 89, 27, 860, 27.47, 88.22, "Forest road → Yuksom", "Yuksom Camp", 12),
        ]
      }
    ]
  },
  {
    name: "Manipur", code: "MN", risk: "high", color: "#f97316", mapX: 82, mapY: 44,
    districts: [
      {
        name: "Senapati", risk: "high", rainfall: 156, soilMoisture: 85, sensors: 8,
        villages: [
          makeVillage("Senapati Town", "high", 156, 85, 32, 18000, 25.27, 94.02, "NH-2 → Imphal", "Imphal Relief Centre", 68),
          makeVillage("Mao Gate", "high", 148, 83, 35, 4200, 25.42, 94.04, "NH-2", "Senapati Town", 24),
          makeVillage("Tadubi", "medium", 112, 76, 49, 3100, 25.22, 93.91, "State road", "Senapati Camp", 18),
          makeVillage("Kangpokpi", "medium", 98, 72, 52, 8400, 25.14, 93.97, "NH-2 → Imphal", "Imphal", 44),
        ]
      },
      {
        name: "Churachandpur", risk: "high", rainfall: 168, soilMoisture: 87, sensors: 9,
        villages: [
          makeVillage("Churachandpur", "medium", 124, 78, 47, 35000, 24.34, 93.68, "NH-150 → Imphal", "Imphal NDRF", 64),
          makeVillage("Saikot", "high", 168, 87, 28, 2800, 24.28, 93.74, "State road → Churachandpur", "Churachandpur Town", 22),
          makeVillage("Henglep", "high", 154, 84, 31, 1900, 24.41, 93.58, "BRO road", "Churachandpur", 34),
        ]
      },
      {
        name: "Ukhrul", risk: "high", rainfall: 162, soilMoisture: 86, sensors: 7,
        villages: [
          makeVillage("Ukhrul Town", "high", 162, 86, 29, 20000, 25.13, 94.36, "NH-102 → Imphal", "Imphal Camp", 82),
          makeVillage("Hungpung", "medium", 118, 77, 48, 3200, 25.21, 94.43, "State road → Ukhrul", "Ukhrul Town", 18),
          makeVillage("Shirui", "high", 148, 83, 33, 1400, 25.24, 94.34, "Ukhrul-Jessami road", "Ukhrul Camp", 12),
        ]
      }
    ]
  },
  {
    name: "Nagaland", code: "NL", risk: "high", color: "#f97316", mapX: 86, mapY: 36,
    districts: [
      {
        name: "Phek", risk: "high", rainfall: 154, soilMoisture: 84, sensors: 7,
        villages: [
          makeVillage("Phek Town", "high", 154, 84, 31, 12000, 25.67, 94.47, "NH-61 → Kohima", "Kohima Relief Base", 64),
          makeVillage("Meluri", "high", 148, 82, 34, 4800, 25.82, 94.51, "State road → Phek", "Phek Town", 28),
          makeVillage("Pfutsero", "medium", 112, 76, 49, 6200, 25.72, 94.38, "State highway → Kohima", "Kohima", 44),
        ]
      },
      {
        name: "Tuensang", risk: "high", rainfall: 162, soilMoisture: 86, sensors: 8,
        villages: [
          makeVillage("Tuensang Town", "high", 162, 86, 28, 16000, 26.27, 94.82, "State road → Kohima", "Kohima NDRF", 198),
          makeVillage("Noklak", "high", 154, 83, 32, 5800, 26.58, 95.18, "BRO road → Tuensang", "Tuensang Camp", 68),
          makeVillage("Shamator", "medium", 118, 77, 47, 3400, 26.43, 94.93, "State road", "Tuensang", 42),
        ]
      },
      {
        name: "Kohima", risk: "medium", rainfall: 118, soilMoisture: 77, sensors: 12,
        villages: [
          makeVillage("Kohima Town", "medium", 118, 77, 48, 99039, 25.67, 94.11, "NH-29 → Dimapur", "Dimapur NDRF Base", 78),
          makeVillage("Khonoma", "medium", 108, 74, 51, 2200, 25.63, 94.03, "State road → Kohima", "Kohima Camp", 14),
          makeVillage("Jakhama", "low", 87, 66, 64, 3800, 25.60, 94.08, "NH-29", "Kohima Town", 8),
        ]
      }
    ]
  },
  {
    name: "Mizoram", code: "MZ", risk: "high", color: "#f97316", mapX: 78, mapY: 52,
    districts: [
      {
        name: "Aizawl", risk: "medium", rainfall: 132, soilMoisture: 79, sensors: 13,
        villages: [
          makeVillage("Aizawl City", "medium", 132, 79, 47, 400309, 23.73, 92.72, "NH-54 → Silchar", "Silchar NDRF", 182),
          makeVillage("Durtlang", "medium", 118, 76, 51, 18000, 23.78, 92.70, "State road → Aizawl", "Aizawl Camp", 8),
          makeVillage("Zemabawk", "low", 94, 68, 62, 12000, 23.71, 92.73, "Aizawl city road", "Aizawl Town", 5),
        ]
      },
      {
        name: "Champhai", risk: "high", rainfall: 158, soilMoisture: 85, sensors: 8,
        villages: [
          makeVillage("Champhai Town", "high", 158, 85, 29, 25000, 23.45, 93.33, "NH-54A → Aizawl", "Aizawl Camp", 192),
          makeVillage("Khawzawl", "high", 148, 82, 33, 8200, 23.64, 93.32, "State road → Champhai", "Champhai Town", 28),
          makeVillage("Ngopa", "medium", 112, 76, 48, 4200, 23.68, 93.22, "State road → Aizawl", "Aizawl", 108),
        ]
      },
      {
        name: "Serchhip", risk: "high", rainfall: 164, soilMoisture: 87, sensors: 7,
        villages: [
          makeVillage("Serchhip Town", "high", 164, 87, 27, 15000, 23.31, 92.85, "NH-54 → Aizawl", "Aizawl NDRF", 74),
          makeVillage("Thenzawl", "high", 152, 84, 31, 4800, 23.17, 92.86, "State road → Serchhip", "Serchhip Camp", 22),
        ]
      },
      {
        name: "Lunglei", risk: "high", rainfall: 178, soilMoisture: 88, sensors: 9,
        villages: [
          makeVillage("Lunglei Town", "high", 178, 88, 28, 54000, 22.88, 92.73, "NH-54 → Aizawl", "Aizawl NDRF", 244),
          makeVillage("Bunghmun", "high", 168, 86, 31, 5400, 22.83, 92.68, "State road → Lunglei", "Lunglei Town", 14),
          makeVillage("Hnahthial", "medium", 128, 79, 46, 8200, 23.04, 92.79, "NH-54", "Lunglei Camp", 54),
        ]
      }
    ]
  },
  {
    name: "Tripura", code: "TR", risk: "medium", color: "#eab308", mapX: 74, mapY: 50,
    districts: [
      {
        name: "Dhalai", risk: "high", rainfall: 148, soilMoisture: 82, sensors: 7,
        villages: [
          makeVillage("Ambassa", "high", 148, 82, 33, 12000, 24.09, 91.87, "NH-44 → Agartala", "Agartala NDRF Base", 62),
          makeVillage("Manu", "medium", 112, 76, 49, 8400, 24.18, 92.13, "State road → Ambassa", "Ambassa Camp", 28),
        ]
      },
      {
        name: "North Tripura", risk: "medium", rainfall: 128, soilMoisture: 79, sensors: 8,
        villages: [
          makeVillage("Dharmanagar", "medium", 128, 79, 47, 42000, 24.37, 92.17, "NH-8 → Agartala", "Agartala NDRF", 192),
          makeVillage("Kanchanpur", "medium", 118, 76, 49, 18000, 24.32, 92.29, "State road → Dharmanagar", "Dharmanagar", 22),
          makeVillage("Panisagar", "low", 94, 68, 63, 8200, 24.39, 92.08, "State highway", "Dharmanagar", 14),
        ]
      }
    ]
  },
  {
    name: "Assam", code: "AS", risk: "high", color: "#f97316", mapX: 72, mapY: 36,
    districts: [
      {
        name: "Karbi Anglong", risk: "high", rainfall: 168, soilMoisture: 85, sensors: 11,
        villages: [
          makeVillage("Diphu", "medium", 124, 78, 48, 50000, 25.84, 93.43, "NH-37 → Guwahati", "Guwahati NDRF", 208),
          makeVillage("Bokajan", "high", 168, 85, 31, 18000, 26.03, 93.57, "State road → Diphu", "Diphu Camp", 28),
          makeVillage("Hamren", "high", 154, 83, 34, 12000, 26.17, 92.99, "State road → Diphu", "Diphu Town", 48),
          makeVillage("Khumtai", "medium", 118, 77, 49, 8200, 26.00, 93.71, "State highway", "Diphu", 32),
        ]
      },
      {
        name: "Dima Hasao", risk: "critical", rainfall: 218, soilMoisture: 93, sensors: 9,
        villages: [
          makeVillage("Haflong", "critical", 218, 93, 20, 32000, 25.17, 93.02, "NH-54 → Silchar / NH-37 → Guwahati", "Silchar NDRF", 182),
          makeVillage("Maibang", "critical", 204, 91, 22, 8400, 25.28, 93.14, "NH-54", "Haflong Camp", 22),
          makeVillage("Umrangso", "high", 162, 86, 31, 14000, 25.56, 93.68, "State road → Haflong", "Haflong Camp", 58),
          makeVillage("Langting", "high", 148, 83, 35, 6800, 25.40, 93.26, "State road → Haflong", "Haflong", 34),
        ]
      },
      {
        name: "Cachar", risk: "medium", rainfall: 132, soilMoisture: 79, sensors: 10,
        villages: [
          makeVillage("Silchar", "low", 94, 66, 63, 228985, 24.82, 92.80, "NH-6 → Guwahati", "Guwahati NDRF", 328),
          makeVillage("Sonai", "medium", 132, 79, 48, 28000, 24.87, 92.91, "State road → Silchar", "Silchar NDRF", 18),
          makeVillage("Lakhipur", "medium", 118, 76, 51, 14000, 24.78, 92.67, "NH-6", "Silchar", 28),
        ]
      },
      {
        name: "Sonitpur", risk: "high", rainfall: 158, soilMoisture: 84, sensors: 10,
        villages: [
          makeVillage("Tezpur", "medium", 118, 76, 51, 100000, 26.63, 92.80, "NH-37 → Guwahati", "Guwahati NDRF", 178),
          makeVillage("Dhekiajuli", "high", 158, 84, 32, 18000, 26.71, 92.77, "State road → Tezpur", "Tezpur Camp", 14),
          makeVillage("Balipara", "high", 148, 82, 34, 12000, 26.80, 92.74, "NH-15 → Tezpur", "Tezpur Town", 22),
        ]
      }
    ]
  },
  {
    name: "Jammu & Kashmir", code: "JK", risk: "high", color: "#f97316", mapX: 14, mapY: 14,
    districts: [
      {
        name: "Ramban", risk: "critical", rainfall: 168, soilMoisture: 88, sensors: 10,
        villages: [
          makeVillage("Ramban Town", "critical", 168, 88, 22, 20000, 33.23, 75.23, "NH-44 → Jammu / Srinagar", "Jammu NDRF Base", 108),
          makeVillage("Banihal", "high", 142, 83, 35, 14000, 33.43, 75.19, "NH-44 → Ramban / Srinagar", "Ramban Camp", 28),
          makeVillage("Gool", "high", 154, 86, 29, 8200, 33.28, 75.36, "State road → Ramban", "Ramban Town", 18),
        ]
      },
      {
        name: "Doda", risk: "high", rainfall: 148, soilMoisture: 84, sensors: 9,
        villages: [
          makeVillage("Doda Town", "high", 148, 84, 31, 18000, 33.14, 75.55, "NH-244 → Ramban", "Ramban NDRF", 84),
          makeVillage("Kishtwar", "high", 142, 82, 34, 22000, 33.31, 75.76, "NH-244 → Doda", "Doda Camp", 62),
          makeVillage("Thathri", "medium", 112, 76, 49, 8400, 33.17, 75.65, "State road → Doda", "Doda Town", 18),
        ]
      },
      {
        name: "Reasi", risk: "high", rainfall: 138, soilMoisture: 82, sensors: 8,
        villages: [
          makeVillage("Reasi Town", "high", 138, 82, 33, 14000, 33.08, 74.84, "NH-244 → Udhampur", "Udhampur NDRF", 44),
          makeVillage("Katra", "medium", 112, 76, 48, 28000, 32.99, 74.93, "NH-44 → Udhampur / Jammu", "Jammu Camp", 64),
        ]
      },
      {
        name: "Poonch", risk: "high", rainfall: 156, soilMoisture: 85, sensors: 8,
        villages: [
          makeVillage("Poonch Town", "high", 156, 85, 29, 28000, 33.77, 74.09, "NH-144A → Jammu", "Jammu NDRF", 250),
          makeVillage("Surankote", "high", 148, 83, 32, 14000, 33.66, 74.15, "State road → Poonch", "Poonch Camp", 28),
          makeVillage("Mender", "medium", 112, 76, 48, 5200, 33.81, 73.98, "State road → Poonch", "Poonch Town", 14),
        ]
      }
    ]
  }
];

export const getAllSearchable = () => {
  const results: { type: "state" | "district" | "village"; stateIdx: number; districtIdx?: number; villageIdx?: number; name: string; risk: RiskLevel }[] = [];
  statesData.forEach((s, si) => {
    results.push({ type: "state", stateIdx: si, name: s.name, risk: s.risk });
    s.districts.forEach((d, di) => {
      results.push({ type: "district", stateIdx: si, districtIdx: di, name: `${d.name}, ${s.name}`, risk: d.risk });
      d.villages.forEach((v, vi) => {
        results.push({ type: "village", stateIdx: si, districtIdx: di, villageIdx: vi, name: `${v.name} — ${d.name}, ${s.name}`, risk: v.risk });
      });
    });
  });
  return results;
};

export const getSensorStats = () => {
  let totalSensors = 0, totalVillages = 0, criticalCount = 0, highCount = 0;
  statesData.forEach(s => {
    s.districts.forEach(d => {
      totalSensors += d.sensors;
      d.villages.forEach(v => {
        totalVillages++;
        if (v.risk === "critical") criticalCount++;
        else if (v.risk === "high") highCount++;
      });
    });
  });
  return { totalSensors, totalVillages, criticalCount, highCount, totalStates: statesData.length };
};
