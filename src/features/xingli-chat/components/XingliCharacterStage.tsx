type XingliCharacterStageProps = {
  portraitUrl: string;
};

export function XingliCharacterStage({ portraitUrl }: XingliCharacterStageProps) {
  return (
    <div className="xingli-chat-character" aria-hidden="true">
      <span className="xingli-chat-character__halo" />
      <img src={portraitUrl} alt="" draggable="false" />
    </div>
  );
}
