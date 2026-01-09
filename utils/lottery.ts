// Fisher-Yates Shuffle Algorithm
export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Pick N random items
export const pickRandom = <T,>(array: T[], count: number): T[] => {
  if (array.length <= count) {
    return shuffleArray(array);
  }
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
};