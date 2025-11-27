import { Container, Button } from "@mantine/core";
import "@mantine/core/styles.css";
import classes from "./HeaderSimple.module.css";
interface HeaderProps {
  title: string;
  author: string;
  reconfigure: () => void;
}
export function HeaderSimple({ title, author, reconfigure }: HeaderProps) {
  return (
    <header className={classes.header}>
      <Container size="md" className={classes.inner}>
        <h1>{title}</h1>
        {author !== "" ? (
          <>
            <p>User: {author}</p>
            <Button onClick={() => reconfigure()}>Logout</Button>
          </>
        ) : (
          <></>
        )}
        <a href="import.meta.env.QUESTIONSUI_SUPPORT_LINK">Support</a>
      </Container>
    </header>
  );
}
