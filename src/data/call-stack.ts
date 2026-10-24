// Shared source of truth for the call-stack walkthrough. Rendered twice: as the
// DOM diagram in CallStackGallery.astro and as the WebGL scene in CallStackScene.astro.
export type Step = {
  title: string;
  description: string;
  depth: number;
  phase: "call" | "return" | "complete";
  active: number;
  returning?: number;
  receiving?: number;
  received?: string;
  value?: string;
};

export const frames = [
  "Our Story",
  "antFalls()",
  "rescueAnt()",
  "makeRope()",
  "getBristle()",
  "getAcorn()",
  "moveCrow()",
  "getChick()",
  "getMillet()",
  "moveMouse()",
  "getMilk()",
  "getGrass()",
];

const callCopyEn = [
  ["The story begins", "Our Story is the initial frame at the bottom of the call stack."],
  ["The ant falls", "Our Story calls antFalls(), pushing a new frame onto the stack."],
  ["The rescue begins", "antFalls() calls rescueAnt(), while the earlier frames wait below it."],
  ["The flea decides to make a rope", "rescueAnt() calls makeRope(), beginning the chain of requests needed for the rescue."],
  ["The flea needs a bristle", "makeRope() calls getBristle() and waits for a bristle."],
  ["The pig needs an acorn", "getBristle() calls getAcorn(), growing the stack again."],
  ["The oak needs the crow to move", "getAcorn() calls moveCrow() and waits for it to complete."],
  ["The crow asks for a chick", "moveCrow() calls getChick(), adding another waiting frame."],
  ["The hen asks for millet", "getChick() calls getMillet() and waits for its result."],
  ["The grain pit needs the mouse to move", "getMillet() calls moveMouse(), pushing another frame."],
  ["The cat asks for milk", "moveMouse() calls getMilk() and waits for milk."],
  ["The cow asks for grass", "getMilk() calls getGrass(), creating the final frame at the top."],
] as const;

const callCopyKa = [
  ["ამბავი იწყება", "Our Story საწყისი ჩარჩოა; ის გამოძახების სტეკის ძირში თავსდება."],
  ["ჭიანჭველა წყალში ვარდება", "Our Story antFalls()-ს იძახებს, სტეკს კი ახალი ჩარჩო ემატება."],
  ["გადარჩენა იწყება", "antFalls() rescueAnt()-ს იძახებს, ქვემოთ მოთავსებული ჩარჩოები კი შედეგს ელოდება."],
  ["რწყილი თოკის გაკეთებას გადაწყვეტს", "rescueAnt() makeRope()-ს იძახებს. აქედან იწყება ჭიანჭველას გადასარჩენად საჭირო თხოვნების ჯაჭვი."],
  ["რწყილს ჯაგარი სჭირდება", "makeRope() getBristle()-ს იძახებს და ჯაგარს ელოდება."],
  ["ღორს რკო სჭირდება", "getBristle() getAcorn()-ს იძახებს, სტეკს კი კიდევ ერთი ჩარჩო ემატება."],
  ["მუხა ყვავის მოშორებას ითხოვს", "getAcorn() moveCrow()-ს იძახებს და მის დასრულებას ელოდება."],
  ["ყვავი წიწილს ითხოვს", "moveCrow() getChick()-ს იძახებს; სტეკს კიდევ ერთი მომლოდინე ჩარჩო ემატება."],
  ["კრუხი ფეტვს ითხოვს", "getChick() getMillet()-ს იძახებს და შედეგს ელოდება."],
  ["ორმო თაგვის მოშორებას ითხოვს", "getMillet() moveMouse()-ს იძახებს და სტეკს ახალ ჩარჩოს ამატებს."],
  ["კატა რძეს ითხოვს", "moveMouse() getMilk()-ს იძახებს და რძეს ელოდება."],
  ["ძროხა ბალახს ითხოვს", "getMilk() getGrass()-ს იძახებს და სტეკის წვეროზე ბოლო ჩარჩო ჩნდება."],
] as const;

const returnStepsEn: Step[] = [
  {
    title: "getGrass() returns grass",
    description: "The first result is found. getGrass() returns grass to getMilk() and leaves the stack.",
    depth: 12, phase: "return", active: 11, returning: 11, receiving: 10, value: "grass",
  },
  {
    title: "getMilk() returns milk",
    description: "getMilk() resumes with the grass, obtains milk, and returns it to moveMouse().",
    depth: 11, phase: "return", active: 10, returning: 10, receiving: 9, received: "grass", value: "milk",
  },
  {
    title: "moveMouse() completes",
    description: "moveMouse() resumes with the milk and confirms that the mouse has moved.",
    depth: 10, phase: "return", active: 9, returning: 9, receiving: 8, received: "milk", value: "mouse moved",
  },
  {
    title: "getMillet() returns millet",
    description: "With the mouse gone, getMillet() obtains millet and returns it to getChick().",
    depth: 9, phase: "return", active: 8, returning: 8, receiving: 7, received: "mouse moved", value: "millet",
  },
  {
    title: "getChick() returns a chick",
    description: "getChick() resumes with the millet and returns a chick to moveCrow().",
    depth: 8, phase: "return", active: 7, returning: 7, receiving: 6, received: "millet", value: "chick",
  },
  {
    title: "moveCrow() completes",
    description: "moveCrow() resumes with the chick and confirms that the crow has moved.",
    depth: 7, phase: "return", active: 6, returning: 6, receiving: 5, received: "chick", value: "crow moved",
  },
  {
    title: "getAcorn() returns an acorn",
    description: "With the crow gone, getAcorn() obtains an acorn and returns it to getBristle().",
    depth: 6, phase: "return", active: 5, returning: 5, receiving: 4, received: "crow moved", value: "acorn",
  },
  {
    title: "getBristle() returns a bristle",
    description: "getBristle() resumes with the acorn, exchanges it for a bristle, and returns the bristle to makeRope().",
    depth: 5, phase: "return", active: 4, returning: 4, receiving: 3, received: "acorn", value: "bristle",
  },
  {
    title: "makeRope() returns a rope",
    description: "makeRope() resumes with the bristle, twists it into a rope, and returns the rope to rescueAnt().",
    depth: 4, phase: "return", active: 3, returning: 3, receiving: 2, received: "bristle", value: "rope",
  },
  {
    title: "rescueAnt() saves the ant",
    description: "rescueAnt() resumes with the rope, pulls the ant from the stream, and confirms that the ant has been rescued.",
    depth: 3, phase: "return", active: 2, returning: 2, receiving: 1, received: "rope", value: "ant rescued",
  },
  {
    title: "antFalls() finishes",
    description: "antFalls() resumes after the rescue and returns control to Our Story, allowing the journey to continue.",
    depth: 2, phase: "return", active: 1, returning: 1, receiving: 0, received: "ant rescued", value: "journey continues",
  },
  {
    title: "The stack finishes unwinding",
    description: "Every function has completed and its frame has been removed. Control is back in Our Story.",
    depth: 1, phase: "complete", active: 0,
  },
];

const returnStepsKa: Step[] = [
  { title: "getGrass() ბალახს აბრუნებს", description: "პირველი შედეგი მიღებულია: getGrass() ბალახს getMilk()-ს უბრუნებს და სტეკს ტოვებს.", depth: 12, phase: "return", active: 11, returning: 11, receiving: 10, value: "ბალახი" },
  { title: "getMilk() რძეს აბრუნებს", description: "getMilk() მიღებული ბალახით მუშაობას აგრძელებს, რძეს მოიპოვებს და moveMouse()-ს უბრუნებს.", depth: 11, phase: "return", active: 10, returning: 10, receiving: 9, received: "ბალახი", value: "რძე" },
  { title: "moveMouse() სრულდება", description: "რძის მიღების შემდეგ moveMouse() მუშაობას აგრძელებს და თაგვს ორმოს აშორებს.", depth: 10, phase: "return", active: 9, returning: 9, receiving: 8, received: "რძე", value: "თაგვი მოშორდა" },
  { title: "getMillet() ფეტვს აბრუნებს", description: "თაგვის მოშორების შემდეგ getMillet() ფეტვს მოიპოვებს და getChick()-ს უბრუნებს.", depth: 9, phase: "return", active: 8, returning: 8, receiving: 7, received: "თაგვი მოშორდა", value: "ფეტვი" },
  { title: "getChick() წიწილს აბრუნებს", description: "getChick() მიღებული ფეტვით მუშაობას აგრძელებს და წიწილს moveCrow()-ს უბრუნებს.", depth: 8, phase: "return", active: 7, returning: 7, receiving: 6, received: "ფეტვი", value: "წიწილი" },
  { title: "moveCrow() სრულდება", description: "წიწილის მიღების შემდეგ moveCrow() მუშაობას აგრძელებს და ყვავს მუხიდან აფრენს.", depth: 7, phase: "return", active: 6, returning: 6, receiving: 5, received: "წიწილი", value: "ყვავი მოშორდა" },
  { title: "getAcorn() რკოს აბრუნებს", description: "ყვავის მოშორების შემდეგ getAcorn() რკოს მოიპოვებს და getBristle()-ს უბრუნებს.", depth: 6, phase: "return", active: 5, returning: 5, receiving: 4, received: "ყვავი მოშორდა", value: "რკო" },
  { title: "getBristle() ჯაგარს აბრუნებს", description: "getBristle() მიღებულ რკოს ჯაგარში ცვლის და ჯაგარს makeRope()-ს უბრუნებს.", depth: 5, phase: "return", active: 4, returning: 4, receiving: 3, received: "რკო", value: "ჯაგარი" },
  { title: "makeRope() თოკს აბრუნებს", description: "makeRope() მიღებული ჯაგრისგან თოკს გრეხს და rescueAnt()-ს უბრუნებს.", depth: 4, phase: "return", active: 3, returning: 3, receiving: 2, received: "ჯაგარი", value: "თოკი" },
  { title: "rescueAnt() ჭიანჭველას გადაარჩენს", description: "rescueAnt() მიღებული თოკით ჭიანჭველას წყლიდან ამოიყვანს.", depth: 3, phase: "return", active: 2, returning: 2, receiving: 1, received: "თოკი", value: "ჭიანჭველა გადარჩა" },
  { title: "antFalls() სრულდება", description: "ჭიანჭველას გადარჩენის შემდეგ antFalls() მუშაობას ასრულებს და მართვას Our Story-ს უბრუნებს. მეგობრებს ახლა გზის გაგრძელება შეუძლიათ.", depth: 2, phase: "return", active: 1, returning: 1, receiving: 0, received: "ჭიანჭველა გადარჩა", value: "გზა გრძელდება" },
  { title: "სტეკი საბოლოოდ იცლება", description: "ყველა ფუნქციამ მუშაობა დაასრულა და მათი ჩარჩოები სტეკიდან ამოღებულია. მართვა ისევ Our Story-ში დაბრუნდა.", depth: 1, phase: "complete", active: 0 },
];

export const getSteps = (locale = "en"): Step[] => {
  const isGeorgian = locale === "ka";
  const callSteps: Step[] = (isGeorgian ? callCopyKa : callCopyEn).map(
    ([title, description], active) => ({
      title,
      description,
      depth: active + 1,
      phase: "call",
      active,
    }),
  );

  return [...callSteps, ...(isGeorgian ? returnStepsKa : returnStepsEn)];
};
