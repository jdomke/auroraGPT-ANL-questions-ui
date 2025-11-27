import { Container } from "@mantine/core";
import { useState } from "react";
import { AuthorInfo, AuthorInfoCallbackData } from "./AuthorInfo";
import { HeaderSimple } from "./HeaderSimple";
import { ContributionsSchema, ReviewSchema, Questions } from "./API";

export function Contributions() {
  const [errorMsg, setErrorMsg] = useState("");
  const [contributions, setContributions] = useState<ContributionsSchema>({
    num_questions: 0,
    num_validated: 0,
    num_reviews: 0,
  });
  const [configured, setConfigured] = useState<boolean>(false);
  const [authorInfo, setAuthorInfo] = useState<AuthorInfoCallbackData>({
    authorName: "",
    authorAffiliation: "",
    orcid: "",
    authorPosition: "",
    reviewerSkills: [],
  });
  const [reviews, setReviews] = useState<ReviewSchema[]>([]);
  const [questions, setQuestions] = useState<Questions[]>([]);

  const configureAuthor = async (author: AuthorInfoCallbackData) => {
    try {
      const author_response = await fetch(
        import.meta.env.BASE_URL + "../api/author",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: author.authorName,
            affilliation: author.authorAffiliation,
            position: author.authorPosition,
            orcid: author.orcid,
          }),
        },
      );
      if (!author_response.ok) {
        throw new Error(author_response.statusText);
      }
      const server_author_info = await author_response.json();

      const contributions_response = await fetch(
        import.meta.env.BASE_URL +
          `../api/contributions/${server_author_info.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!contributions_response) {
        throw new Error(author_response.statusText);
      }
      const c: ContributionsSchema = await contributions_response.json();

      const reviews_response = await fetch(
        import.meta.env.BASE_URL +
          `../api/review?reviewer_id=${server_author_info.id}&limit=1000`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const loaded_reviews: ReviewSchema[] = await reviews_response.json();

      const question_response = await fetch(
        import.meta.env.BASE_URL +
          `../api/question?author_id=${server_author_info.id}&limit=1000`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const loaded_questions: Questions[] = await question_response.json();

      setReviews(loaded_reviews);
      setQuestions(loaded_questions);
      setContributions(c);
      setAuthorInfo(author);
      setConfigured(true);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(`Author could not be found ${error}`);
    }
  };

  let header = (
    <HeaderSimple
      author={authorInfo.authorName}
      title="AI4Science Contributions"
      reconfigure={() => {
        setConfigured(false);
      }}
    />
  );
  if (!configured) {
    return (
      <>
        {header}
        <Container>
          <AuthorInfo
            authRequired={false}
            configureAuthor={configureAuthor}
            defaults={authorInfo}
            actionTitle="Reviewing Contributions"
          />
        </Container>
      </>
    );
  }
  if (errorMsg !== "") {
    return (
      <>
        {header}
        <Container>
          <h1>Author Not Found</h1>
          <p>
            We are sorry, but we cannot find your contributions. Please try
            logging in again or contact support
          </p>
        </Container>
      </>
    );
  }

  return (
    <>
      {header}
      <Container>
        <h1>Contributions of {authorInfo.authorName}</h1>
        <p>We thank you very much for your contributions to JAPAN SCIENTIST AI JAM!</p>
        <p>
          The evaluation effort is in an early stage. As you know Science is a
          process. Please be patient with us as we work to validate questions
          and debug our workflow. If you are missing contributions you expect to
          see please confirm you logged in the same way as before or contact{" "}
          <a href="https://discord.com/channels/1425739090086596618/1425739090992693260">support</a> with
          what contributions you expect to see. If you are missing questions
          please provide the topic of the question and/or the source for the
          question
        </p>
        <p> Reviews {contributions.num_reviews} </p>
        <p> Questions: {contributions.num_questions} </p>
        <p> Validated: {contributions.num_validated} -- subject to change </p>
        <h1>Questions</h1>
        <ul>
          {questions.map((x: Questions) => {
            return (
              <li key={x.id}>
                {x.id} {x.question}
              </li>
            );
          })}
        </ul>
        <h1>Reviews</h1>
        <ul>
          {reviews.map((x: ReviewSchema) => {
            return (
              <li key={x.id}>
                Question ID {x.question_id} {x.accept ? "✓" : "✕"} --{" "}
                {x.comments}
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}
