export const PLAYER_BOATS = [
  {model: 'boat-express-37', name: 'Express 37 · fast twin-outboard cruiser'},
  {model: 'boat-offshore-44', name: 'Offshore 44 · heavy triple-outboard cruiser'},
  {model: 'boat-cat-42', name: 'Blackjack 42 · racing catamaran'},
  {model: 'boat-speed-c', name: 'Sport · hardtop racer'},
  {model: 'boat-speed-a', name: 'Runabout · coastal leisure'},
  {model: 'boat-house-a', name: 'Cruiser · enclosed flybridge'},
  {model: 'boat-tug-a', name: 'Sailboat · auxiliary-powered'},
  {model: 'boat-speed-d', name: 'Classic · teak runabout'},
];

export const PLAYER_LENGTH = 7.4;
export const isPlayerBoat = (model) => PLAYER_BOATS.some((boat) => boat.model === model);
