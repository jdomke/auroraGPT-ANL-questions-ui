import "@mantine/core/styles.css";
import {
  Container,
  List,
  Text,
  Anchor,
} from "@mantine/core";
import { HeaderSimple } from "./HeaderSimple";
export function Main() {
    return (<Container>
        <HeaderSimple title="JAPAN SCIENTIST AI JAM - Model Eval Platform" author="" reconfigure={()=> {}}/>
        <Text>Welcome to the JAPAN SCIENTIST AI JAM - AI Model Evaluation Platform.  What task would you like to do today?</Text>
        <List>
	    <List.Item><a href="authoring">Write Multiple Choice Questions</a></List.Item>
            <List.Item><a href="reviewing">Review Multiple Choice Questions</a></List.Item>
            <List.Item><a href="contributions">See Multiple Choice Question Contributions</a></List.Item>
	    <List.Item><a href="labstyle">Perform a LabStyle Experiment</a></List.Item>
            <List.Item><a href="monitor">Monitor Experiment Progress</a></List.Item>
            <List.Item><a href="editorial">Help curate questions</a></List.Item>
        </List>

        <Text>This page is derived from auroraGPT-ANL's questions-ui. More on this tool can be found on <Anchor target="_blank" href="https://github.com/auroraGPT-ANL/questions-ui/">GitHub</Anchor> or on the <Anchor target="_blank" href="https://arxiv.org/abs/2502.20309">Paper</Anchor></Text>
    </Container>);
}
