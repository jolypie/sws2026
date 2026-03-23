import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import LanguageIcon from "@mui/icons-material/Language";
import AddIcon from "@mui/icons-material/Add";

export default function EmptyDomains({ onAdd }) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 5,
        border: "1px solid",
        borderColor: "#a3e635",
        borderRadius: 2,
      }}
    >
      <LanguageIcon sx={{ fontSize: 48, color: "#a3e635", mb: 1 }} />
      <Typography variant="h5" color="#a3e635" gutterBottom>
        You dont have any domains yet.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAdd}
        sx={{
          background: "transparent",
          color: "#a3e635",
          border: "1px solid #a3e635",
        }}
      >
        Create your first domain
      </Button>
    </Box>
  );
}
