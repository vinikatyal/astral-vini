import TsxRunner from "@/components/lesson/LessonTsxRunner";

export default async function LessonDetailsPage({ params }: { params: { id: string } }) {

  // call api to get lesson tsx source by id

  const param = await params // {locale: "id"}
  const id = await param.id // id

  const lessonData = await fetch(process.env.BASE_URL + "/api/lessons/lesson?id=" + id);
  const lessonInfo = await lessonData.json();

  console.log("Get lesson:", lessonInfo);

  const res = await fetch(process.env.BASE_URL + "/api/lessons/lesson?id=" + id, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lesson: lessonInfo
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create lesson: ${res.statusText}`);
  }

  const result = await res.json();



  // create chapter api here
  return <div>
    {result.tsxSource ? (
      <TsxRunner source={result.tsxSource} />
    ) : (
      <p className="text-red-600">No lesson TSX source available.</p>
    )}
  </div>;
}