import TsxRunner from "@/components/lesson/LessonTsxRunner";

export default async function LessonDetailsPage({ params }: { params: { id: string } }) {

  // call api to get lesson tsx source by id

  console.log(params.id);

  const res = await fetch(process.env.BACKEND_URL + "/api/lessons/lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "id": "0b062b96-c967-47e0-824b-e66451a2f3ed",
      "title": "nderstanding higher-order functions for complex array manipulations.",
      "description": "Understanding higher-order functions for complex array manipulations.",
      "outline": "Master Arrays in JavaScript",
      "details":
        `This final section will delve into advanced methods like .map(), .filter(), and .reduce(). These functions allow us to create new arrays, filter elements based on conditions, and reduce arrays to a single value. Example:

// Filtering fruits that start with 'b'
let filteredFruits = fruits.filter(fruit => fruit.startsWith('b'));

// Summing up an array of numbers
let sum = numbers.reduce((total, num) => total + num, 0);`,
      "status": "generated",
      "updated_at": "2025-11-05T05:23:21.014Z"
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create lesson: ${res.statusText}`);
  }
  console.log("Generated tsx:", res);

  const result = await res.json();

  console.log("Generated result:", result);

  // create chapter api here
  return <div>
    {result.tsxSource ? (
      <TsxRunner source={result.tsxSource} props={{
        lesson: {
      "id": "0b062b96-c967-47e0-824b-e66451a2f3ed",
      "title": "nderstanding higher-order functions for complex array manipulations.",
      "description": "Understanding higher-order functions for complex array manipulations.",
      "outline": "Master Arrays in JavaScript",
      "details":
        `This final section will delve into advanced methods like .map(), .filter(), and .reduce(). These functions allow us to create new arrays, filter elements based on conditions, and reduce arrays to a single value. Example:

// Filtering fruits that start with 'b'
let filteredFruits = fruits.filter(fruit => fruit.startsWith('b'));

// Summing up an array of numbers
let sum = numbers.reduce((total, num) => total + num, 0);`,
      "status": "generated",
      "updated_at": "2025-11-05T05:23:21.014Z"
    }
      }} />
    ) : (
      <p className="text-red-600">No lesson TSX source available.</p>
    )}
  </div>;
}