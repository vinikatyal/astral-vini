import TsxRunner from "@/components/lesson/LessonTsxRunner";

export default async function LessonDetailsPage({ params }: { params: { id: string } }) {

  const param = await params // {locale: "id"}
  const id = await param.id // id

  const lessonData = await fetch(process.env.BASE_URL + "/api/lessons/"+id);
  const lessonInfo = await lessonData.json();


  // create chapter api here
  return <div>
    {lessonInfo.code ? (
      <TsxRunner source={lessonInfo.code} />
    ) : (
      <p className="text-red-600">No lesson TSX source available.</p>
    )}
  </div>;
}