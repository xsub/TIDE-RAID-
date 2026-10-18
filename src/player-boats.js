export const PLAYER_BOATS = [
  {model: 'boat-speed-c', name: 'Sport · hardtop racer'},
  {model: 'boat-speed-a', name: 'Runabout · coastal leisure'},
  {model: 'boat-house-a', name: 'Cruiser · enclosed flybridge'},
  {model: 'boat-tug-a', name: 'Sailboat · auxiliary-powered'},
  {model: 'boat-speed-d', name: 'Classic · teak runabout'},
];

export const PLAYER_LENGTH = 7.4;
export const isPlayerBoat = (model) => PLAYER_BOATS.some((boat) => boat.model === model);
