export function Footer() {
  return (
    <footer className="mt-auto py-6 px-4 border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          Sistema idealizado por{" "}
          <a
            href="https://www.linkedin.com/in/vanessaazuos/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Vanessa Dias
          </a>{" "}
          e desenvolvido por{" "}
          <a
            href="https://www.linkedin.com/in/andressamirian/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Andressa Mirian
          </a>{" "}
          no ano de 2025.
        </p>
        <p className="text-xs text-muted-foreground/80 mt-2">
          Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
