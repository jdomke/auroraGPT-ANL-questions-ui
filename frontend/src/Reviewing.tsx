import {
  Container,
  Grid,
  Button,
  Group,
  Textarea,
  Slider,
  Text,
  Flex,
} from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { notifications, Notifications } from "@mantine/notifications";
import { useState, useRef, useEffect } from "react";
import { Questions, AuthorResponseSchema, ReviewSchema } from "./API";
import { AuthorInfoCallbackData, AuthorInfo } from "./AuthorInfo";
import { HeaderSimple } from "./HeaderSimple";

enum ReviewAction {
  approved,
  skipped,
  rejected,
}
function formatReviewAction(r: ReviewAction | string): string {
  switch (r) {
    case ReviewAction.approved:
    case "approved":
      return "✓";
    case ReviewAction.rejected:
    case "rejected":
      return "✕";
    case ReviewAction.skipped:
    case "skip":
      return "⏩";
    default:
      return "";
  }
}

async function nextQuestion(reviewerID: number, authorInfo: AuthorInfoCallbackData, setQuestion: (question: Questions) => void) {
    //determine the next question and load it
    const reviewbatch_response = await fetch(
      import.meta.env.BASE_URL + "../api/review_batch?limit=1&validations=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: reviewerID,
          domains: authorInfo.reviewerSkills,
        }),
      },
    );
    if (!reviewbatch_response.ok) {
      throw new Error(reviewbatch_response.statusText);
    }

    //should have 0 or 1 elements
    const to_review_ids: number[] = await reviewbatch_response.json();
    if (to_review_ids.length == 1) {
      const ids_query = "?" + to_review_ids.map((x) => `ids=${x}`).join("&");
      const questions_response = await fetch(
        import.meta.env.BASE_URL + `../api/question${ids_query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!questions_response.ok) {
        throw new Error(questions_response.statusText);
      }
      const review_questions: Questions[] = await questions_response.json();
      setQuestion(review_questions[0]);
    } else {
      console.log(to_review_ids);
    }

}

interface History {
  review_id: number | null;
  question: string;
  question_id: number;
  action: ReviewAction;
  modified: Date;
}
interface ProgressProps {
  project: string;
  sofar: number;
  goal: number;
  history: History[];
}
interface ProgressTrackerUIProps {
  progress: ProgressProps;
  navigateHistoryCallback: (question_id: number) => void;
}
function ProgressTrackerUI({
  progress,
  navigateHistoryCallback,
}: ProgressTrackerUIProps) {
  const { project, sofar, history, goal } = progress;
  const marks = [
    { value: 0, label: "" },
    { value: sofar, label: `So Far ${sofar}` },
    { value: goal, label: `Goal ${goal}` },
  ];
  return (
    <>
      <h1>Project</h1>
      <p>{project}</p>
      <h1>Progress</h1>
      {goal == 0 ? (
        <Text>Nothing to do</Text>
      ) : (
        <Slider min={0} max={goal} value={sofar} marks={marks} disabled />
      )}
      <h1>Recent Reviews</h1>
      {history.length !== 0 ? (
        <ul>
          {history.map((h) => (
            <li key={`${h.review_id}-${h.question_id}`}>
              <a onClick={() => navigateHistoryCallback(h.question_id)}>
                {formatReviewAction(h.action)} {h.question_id}:{" "}
                {h.question.substring(0, 100) +
                  (h.question.length > 100 ? "…" : "")}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Text>You haven't reviewed yet</Text>
      )}
    </>
  );
}

interface FeedbackProps {
  id: keyof Scores;
  value: Feedback;
  question: string;
  setFeedback: (id: keyof Scores, newvalue: string) => void;
  focusref?: React.MutableRefObject<HTMLInputElement | null>;
}
function FeedbackSlider({
  focusref,
  id,
  question,
  setFeedback,
  value,
}: FeedbackProps) {
  const marks = [
    { value: 1, label: "1: absolutely not" },
    { value: 2, label: "2: likely not" },
    { value: 3, label: "3: likely" },
    { value: 4, label: "4: absolutely" },
  ];

  return (
    <>
      <Text>{question}</Text>
      <Slider
        ref={focusref}
        label={question}
        min={1}
        max={4}
        defaultValue={2}
        value={value.scores[id]}
        step={1}
        marks={marks}
        onChangeEnd={(e) => {
          setFeedback(id, `${e}`);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          switch (e.key) {
            case "1":
            case "2":
            case "3":
            case "4":
              setFeedback(id, e.key);
              break;
            case "ArrowUp":
            case "ArrowRight":
              setFeedback(id, `${Math.min(value.scores[id] + 1, 5)}`);
              break;
            case "ArrowDown":
            case "ArrowLeft":
              setFeedback(id, `${Math.max(value.scores[id] - 1, 1)}`);
              break;
          }
        }}
      />
    </>
  );
}

interface Scores {
  questionrelevent: number;
  questionfromarticle: number;
  questionindependence: number;
  questionchallenging: number;
  answerrelevent: number;
  answercomplete: number;
  answerfromarticle: number;
  answerunique: number;
  answeruncontroverial: number;
  arithmaticfree: number;
  skillcorrect: number;
  domaincorrect: number;
}
interface Feedback {
  scores: Scores;
  comments: string;
}

interface FeedbackUIProps {
  question: Questions;
  question_id: number;
  reviewer_id: number;
  skipCallback: (question_id: number) => void;
  submitCallback: (approved: boolean, review_id: number) => void;
}
function FeedbackUI({
  question,
  skipCallback,
  submitCallback,
  question_id,
  reviewer_id,
}: FeedbackUIProps) {
  const [reviewID, setReviewID] = useState<number | null>(null);
  const [feedback, setFeedbackRaw] = useState<Feedback>({
    scores: {
      questionrelevent: 3,
      questionfromarticle: 3,
      questionindependence: 3,
      questionchallenging: 3,
      answerrelevent: 3,
      answercomplete: 3,
      answerfromarticle: 3,
      answerunique: 3,
      answeruncontroverial: 3,
      arithmaticfree: 3,
      skillcorrect: 3,
      domaincorrect: 3,
    },
    comments: "",
  });
  useEffect(() => {
    const fn = async () => {
      try {
        const response = await fetch(
          import.meta.env.BASE_URL +
            `../api/review?reviewer_id=${reviewer_id}&question_id=${question_id}`,
        );
        const prior_review: ReviewSchema[] = await response.json();
        if (prior_review.length >= 1) {
          setReviewID(prior_review[0].id);
          setFeedbackRaw({
            comments: prior_review[0].comments,
            scores: {
              questionrelevent: prior_review[0].questionrelevent,
              questionfromarticle: prior_review[0].questionfromarticle,
              questionindependence: prior_review[0].questionindependence,
              questionchallenging: prior_review[0].questionchallenging,
              answerrelevent: prior_review[0].answerrelevent,
              answercomplete: prior_review[0].answercomplete,
              answerfromarticle: prior_review[0].answerfromarticle,
              answerunique: prior_review[0].answerunique,
              answeruncontroverial: prior_review[0].answeruncontroverial,
              arithmaticfree: prior_review[0].arithmaticfree,
              skillcorrect: prior_review[0].skillcorrect,
              domaincorrect: prior_review[0].domaincorrect,
            },
          });
        } else {
          setReviewID(null);
        }
      } catch (error) {
        setReviewID(null);
      }
    };
    fn();
  }, [question_id, reviewer_id]);
  const setFeedback = (id: keyof Scores, newvalue: string) => {
    const newFeedback = { ...feedback };
    newFeedback.scores[id] = parseInt(newvalue);
    setFeedbackRaw(newFeedback);
  };
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current !== null) {
      ref.current.focus();
    }
  }, []);

  const SubmitFeedback = async (approve: boolean) => {
    if (reviewID === null) {
      const response = await fetch(import.meta.env.BASE_URL + "../api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: reviewer_id,
          question_id: question_id,
          questionrelevent: feedback.scores.questionrelevent,
          questionfromarticle: feedback.scores.questionfromarticle,
          questionindependence: feedback.scores.questionindependence,
          questionchallenging: feedback.scores.questionchallenging,
          answerrelevent: feedback.scores.answerrelevent,
          answercomplete: feedback.scores.answercomplete,
          answerfromarticle: feedback.scores.answerfromarticle,
          answerunique: feedback.scores.answerunique,
          answeruncontroverial: feedback.scores.answeruncontroverial,
          arithmaticfree: feedback.scores.arithmaticfree,
          skillcorrect: feedback.scores.skillcorrect,
          domaincorrect: feedback.scores.domaincorrect,
          comments: feedback.comments,
          accept: approve,
        }),
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const review: ReviewSchema = await response.json();
      submitCallback(approve, review.id);
    } else {
      //updating an existing review
      const response = await fetch(
        import.meta.env.BASE_URL + `../api/review/${reviewID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            author: reviewer_id,
            question_id: question_id,
            questionrelevent: feedback.scores.questionrelevent,
            questionfromarticle: feedback.scores.questionfromarticle,
            questionindependence: feedback.scores.questionindependence,
            questionchallenging: feedback.scores.questionchallenging,
            answerrelevent: feedback.scores.answerrelevent,
            answercomplete: feedback.scores.answercomplete,
            answerfromarticle: feedback.scores.answerfromarticle,
            answerunique: feedback.scores.answerunique,
            answeruncontroverial: feedback.scores.answeruncontroverial,
            arithmaticfree: feedback.scores.arithmaticfree,
            skillcorrect: feedback.scores.skillcorrect,
            domaincorrect: feedback.scores.domaincorrect,
            comments: feedback.comments,
            accept: approve,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const review: ReviewSchema = await response.json();
      submitCallback(approve, review.id);
    }
  };

  return (
    <>
      <h1>Feedback</h1>
      <Text>
        <strong>Question ID:</strong> {question.id}
      </Text>
      <Flex direction="column" gap="lg">
        <div>
          <Text>
            <strong>Using only the text and source of the question:</strong>
          </Text>
          <blockquote>{question.question}</blockquote>
          <Text>
            <strong>Comments:</strong> {question.comments}
          </Text>
          <Text>
            <strong>Reference (ISBN/DOI/XiV):</strong> {question.doi}
          </Text>
          <Text>
            <strong>Support:</strong> {question.support}
          </Text>
        </div>
        <FeedbackSlider
          focusref={ref}
          id="questionrelevent"
          setFeedback={setFeedback}
          value={feedback}
          question="Is the question relevant to the original article?"
        />
        <FeedbackSlider
          id="questionfromarticle"
          setFeedback={setFeedback}
          value={feedback}
          question="Can the question be answered definitively based on the article?"
        />
        <FeedbackSlider
          id="questionindependence"
          setFeedback={setFeedback}
          value={feedback}
          question="Can this question be answered on its own without the article? (e.g. Does it reference the content of a figure? Quote specific values or phrases?)"
        />
        <div>
          <Text>
            <strong>Now consider the answers:</strong>
          </Text>
          <Text>
            <strong>Correct Answer:</strong>
            {question.correct_answer}
          </Text>
          <Text>
            <strong>Distractors:</strong>
          </Text>
          <ul>
            {question.distractors.map((e, idx) => {
              return <li key={idx}>{e}</li>;
            })}
          </ul>
        </div>
        <FeedbackSlider
          id="questionchallenging"
          setFeedback={setFeedback}
          value={feedback}
          question="I think this question is appropriately challenging for a graduate level exam on this topic."
        />
        <FeedbackSlider
          id="answerrelevent"
          setFeedback={setFeedback}
          value={feedback}
          question="How relevent is the answer to the question?"
        />
        <FeedbackSlider
          id="answerfromarticle"
          setFeedback={setFeedback}
          value={feedback}
          question="How relevent is the answer to the content of the article?"
        />
        <FeedbackSlider
          id="answercomplete"
          setFeedback={setFeedback}
          value={feedback}
          question="How completely do the answers respond to the question?"
        />
        <FeedbackSlider
          id="answerunique"
          setFeedback={setFeedback}
          value={feedback}
          question="There is only one correct answer?"
        />
        <FeedbackSlider
          id="answeruncontroverial"
          setFeedback={setFeedback}
          value={feedback}
          question="Is the answer uncontroverial to the question?"
        />
        <div>
          <Text>
            <strong>
              Now think overall and consider the skills and domains involved:
            </strong>
          </Text>
          <Flex direction="row" gap="2em">
            <div>
              <Text>
                <strong>Domains</strong>
              </Text>
              <ul>
                {question.skills.map((skill, idx) => (
                  <li key={idx}>{skill}</li>
                ))}
              </ul>
            </div>
            <div>
              <Text>
                <strong>Skills</strong>
              </Text>
              <ul>
                {question.domains.map((domain, idx) => (
                  <li key={idx}>{domain}</li>
                ))}
              </ul>
            </div>
          </Flex>
        </div>
        <FeedbackSlider
          id="arithmaticfree"
          setFeedback={setFeedback}
          value={feedback}
          question="Does this question and answers avoid arithmatic?"
        />
        <FeedbackSlider
          id="skillcorrect"
          setFeedback={setFeedback}
          value={feedback}
          question="Are the skills selected appropraite for the question?"
        />
        <FeedbackSlider
          id="domaincorrect"
          setFeedback={setFeedback}
          value={feedback}
          question="Are the domains selected appropraite for the question?"
        />
        <Textarea
          label="Comments"
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFeedbackRaw({ ...feedback, comments: e.currentTarget.value })
          }
        />
        <Group>
          <Button
            variant="filled"
            color="green"
            onClick={() => SubmitFeedback(true)}
          >
            Recommend Approve
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={() => SubmitFeedback(false)}
          >
            Recommend Reject
          </Button>
          <Button onClick={() => skipCallback(question_id)}>Skip</Button>
        </Group>
      </Flex>
    </>
  );
}

export function QuestionReviewing() {
  const [configured, setConfigured] = useState<boolean>(false);
  const [authorInfo, setAuthorInfo] = useState<AuthorInfoCallbackData>({
    authorName: "",
    authorAffiliation: "",
    orcid: "",
    authorPosition: "",
    reviewerSkills: [],
  });
  const [reviewerID, setReviewerID] = useState(0);
  const [progress, setProgress] = useState<ProgressProps>({
    project: "JAPAN-SCIENTIST-AI-JAM",
    sofar: 0,
    goal: 50,
    history: [],
  });
  const [question, setQuestion] = useState<Questions | null>(null);

  const configureReviewer = async (authorInfo: AuthorInfoCallbackData) => {
    setAuthorInfo(authorInfo);
    const author_response = await fetch(
      import.meta.env.BASE_URL + "../api/author",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authorInfo.authorName,
          affilliation: authorInfo.authorAffiliation,
          position: authorInfo.authorPosition,
          orcid: authorInfo.orcid,
        }),
      },
    );
    if (!author_response.ok) {
      throw new Error(author_response.statusText);
    }
    const server_author_info: AuthorResponseSchema =
      await author_response.json();
    setReviewerID(server_author_info.id);

    const reviewbatch_response = await fetch(
      import.meta.env.BASE_URL + "../api/review_batch?limit=1&validations=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: server_author_info.id,
          domains: authorInfo.reviewerSkills,
        }),
      },
    );
    if (!reviewbatch_response.ok) {
      throw new Error(reviewbatch_response.statusText);
    }
    //should have 0 or 1 elements
    const to_review_ids: number[] = await reviewbatch_response.json();

    const reviewhistory_response = await fetch(
      import.meta.env.BASE_URL +
        `../api/reviewhistory/${server_author_info.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!reviewhistory_response.ok) {
      throw new Error(reviewbatch_response.statusText);
    }
    const reviewer_history: History[] = await reviewhistory_response.json();

    setProgress((progress: ProgressProps) => {
      return { ...progress, goal: 50, history: reviewer_history };
    });

    if (to_review_ids.length == 1) {
      const ids_query = "?" + to_review_ids.map((x) => `ids=${x}`).join("&");
      const questions_response = await fetch(
        import.meta.env.BASE_URL + `../api/question${ids_query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!questions_response.ok) {
        throw new Error(questions_response.statusText);
      }
      const review_questions: Questions[] = await questions_response.json();
      setQuestion(review_questions[0]);
    } else {
      console.log(to_review_ids);
    }

    setConfigured(true);
  };


  const skipCallback = async (question_id: number) => {
    try {
      const skip_response = await fetch(
        import.meta.env.BASE_URL + `../api/skip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            author: reviewerID,
            question_id: question_id,
          }),
        },
      );
      if (!skip_response.ok) {
        throw new Error(`failed to skip: ${skip_response.statusText}`);
      }
      if(progress.goal <= progress.sofar) {
          notifications.show({
            title: "submitted review",
            message: `You've done great!, would you like to do 5 more?`,
            autoClose: 5000,
          });
      }
      setProgress((progress: ProgressProps) => {
        return {
          ...progress,
          sofar: progress.sofar + 1,
          goal: (progress.goal <= progress.sofar)? progress.goal+5: progress.goal,
          history: [
            {
              review_id: null,
              question: question!.question,
              question_id: question!.id!,
              action: ReviewAction.skipped,
              modified: new Date(),
            },
            ...progress.history,
          ],
        };
      });
      await nextQuestion(reviewerID, authorInfo, setQuestion);


      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      notifications.show({
        title: "skipped question",
        message: `We'll skip it.  We won't show you this question automatically again`,
        autoClose: 5000,
      });
    } catch (err) {
      notifications.show({
        title: "skipped question failed",
        message: `we failed to skip this question ${err}`,
      });
    }
  };
  const submitCallback = async (approved: boolean, review_id: number) => {
    if(progress.goal <= progress.sofar) {
        notifications.show({
          title: "submitted review",
          message: `You've done great!, would you like to do 5 more?`,
          autoClose: 5000,
        });
    }
    notifications.show({
      title: "submitted review",
      message: `successfully submitted your question: ${question!.id!}: ${question!.question}`,
      autoClose: 5000,
    });
    setProgress((progress: ProgressProps) => {
      return {
        ...progress,
        sofar: progress.sofar + 1,
        goal: (progress.goal <= progress.sofar)? progress.goal+5: progress.goal,
        history: [
          {
            review_id: review_id,
            question_id: question!.id!,
            question: question!.question,
            action: approved ? ReviewAction.approved : ReviewAction.rejected,
            modified: new Date(),
          },
          ...progress.history,
        ],
      };
    });

    await nextQuestion(reviewerID, authorInfo, setQuestion);

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    notifications.show({
      title: "submitted review",
      message: `successfully submitted your question: ${question!.id!}: ${question!.question}`,
      autoClose: 5000,
    });
  };

  const navigateHistoryCallback = async (question_id: number) => {
    try {
      const questions_response = await fetch(
        import.meta.env.BASE_URL + `../api/question?ids=${question_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const next_question: Questions[] = await questions_response.json();
      if (next_question.length === 1) {
        setQuestion(next_question[0]);
      } else {
        throw Error(`failed to retrieve question ${question_id}`);
      }

      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (error) {
      notifications.show({
        title: "navigation failed",
        message: `There was a problem loading a question: ${error}`,
      });
    }
  };

  return (
    <>
      <HeaderSimple
        title="AI4Science Reviewing"
        author={authorInfo.authorName}
        reconfigure={() => {
          setConfigured(false);
        }}
      />
      <Notifications position="top-center" />
      <Container>
        {configured ? (
          <Grid>
            <Grid.Col span={4}>
              <Container>
                <ProgressTrackerUI
                  progress={progress}
                  navigateHistoryCallback={navigateHistoryCallback}
                />
              </Container>
            </Grid.Col>
            <Grid.Col span={8}>
              <Container>
                {question !== null ? (
                  <>
                    <FeedbackUI
                      question={question}
                      question_id={question.id || 0}
                      reviewer_id={reviewerID}
                      skipCallback={skipCallback}
                      submitCallback={submitCallback}
                    />
                  </>
                ) : (
                  <>
                    <h1>Thanks for offering to review</h1>
                    <Text>
                      We have no more questions requiring your expertise at this
                      time. Please come back later after more questions have
                      been developed, or select more review topics.
                    </Text>
                  </>
                )}
              </Container>
            </Grid.Col>
          </Grid>
        ) : (
          <AuthorInfo
            authRequired={false}
            actionTitle="Reviewing"
            configureAuthor={configureReviewer}
            defaults={authorInfo}
          />
        )}
      </Container>
    </>
  );
}
